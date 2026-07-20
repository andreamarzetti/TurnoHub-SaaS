import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, professionalsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateSubscriptionBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const PLANS = [
  {
    id: 1,
    name: "Básico",
    slug: "basico",
    priceMonthly: 9900,
    maxServices: 3,
    maxAppointmentsPerMonth: 50,
    features: [
      "Hasta 3 servicios",
      "Hasta 50 turnos por mes",
      "Página de reserva personalizada",
      "Confirmación automática por email",
      "Historial de clientes",
    ],
  },
  {
    id: 2,
    name: "Profesional",
    slug: "profesional",
    priceMonthly: 14900,
    maxServices: 10,
    maxAppointmentsPerMonth: 200,
    features: [
      "Hasta 10 servicios",
      "Hasta 200 turnos por mes",
      "Recordatorios por WhatsApp",
      "Recordatorios por email",
      "Reprogramar y cancelar turnos",
      "Historial completo de clientes",
      "Configuración de redes sociales",
    ],
  },
  {
    id: 3,
    name: "Premium",
    slug: "premium",
    priceMonthly: 19900,
    maxServices: null,
    maxAppointmentsPerMonth: null,
    features: [
      "Servicios ilimitados",
      "Turnos ilimitados",
      "Todo lo del plan Profesional",
      "Soporte prioritario",
      "Personalización avanzada",
      "Integración con Mercado Pago para cobro de turnos",
      "Reportes y estadísticas completas",
    ],
  },
];

async function getProfessionalForUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [prof] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  return prof || null;
}

/** Check and expire trial subscriptions on the fly */
async function checkAndExpireTrial(professionalId: number) {
  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, professionalId))
    .limit(1);
  if (!sub) return;

  const now = new Date();
  if (sub.status === "trial" && sub.currentPeriodEnd < now) {
    await db.update(subscriptionsTable)
      .set({ status: "past_due", updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, sub.id));
    await db.update(professionalsTable)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(professionalsTable.id, professionalId));
  }
}

router.get("/plans", async (_req, res) => {
  res.json(PLANS);
});

router.get("/me", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  await checkAndExpireTrial(prof.id);

  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, prof.id))
    .orderBy(subscriptionsTable.createdAt)
    .limit(1);

  if (!sub) { res.status(404).json({ error: "No subscription found" }); return; }
  res.json(sub);
});

router.post("/me", requireAuth, async (req, res) => {
  const parsed = CreateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const planSlug = parsed.data.planSlug;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const [existing] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, prof.id))
    .limit(1);

  let sub;
  if (existing) {
    [sub] = await db.update(subscriptionsTable)
      .set({ planSlug, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, existing.id))
      .returning();
  } else {
    [sub] = await db.insert(subscriptionsTable).values({
      professionalId: prof.id,
      planSlug,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    }).returning();
  }

  await db.update(professionalsTable)
    .set({ currentPlan: planSlug, status: "active", updatedAt: new Date() })
    .where(eq(professionalsTable.id, prof.id));

  res.status(201).json(sub);
});

router.post("/me/cancel", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [existing] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, prof.id))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "No subscription found" }); return; }

  const [updated] = await db.update(subscriptionsTable)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptionsTable.id, existing.id))
    .returning();

  res.json(updated);
});

// ─── Mercado Pago ─────────────────────────────────────────────────────────────

const MP_API = "https://api.mercadopago.com";

function getMpAccessToken(): string | null {
  return process.env.MP_ACCESS_TOKEN || null;
}

/** Create a MP preapproval subscription and return the checkout URL */
router.post("/mp/checkout", requireAuth, async (req, res) => {
  const token = getMpAccessToken();
  if (!token) {
    res.status(503).json({ error: "Mercado Pago no está configurado aún. Contactá al administrador." });
    return;
  }

  const { planSlug } = req.body as { planSlug: string };
  const plan = PLANS.find((p) => p.slug === planSlug);
  if (!plan) {
    res.status(400).json({ error: "Plan inválido" });
    return;
  }

  const prof = await getProfessionalForUser(req.session.userId!);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!prof || !user) { res.status(404).json({ error: "Not found" }); return; }

  const domains = (process.env.REPLIT_DOMAINS || "localhost:80").split(",")[0];
  const baseUrl = `https://${domains}`;

  const payload = {
    reason: `Plan ${plan.name} - TurnoHub`,
    external_reference: `prof_${prof.id}_plan_${plan.slug}_${Date.now()}`,
    payer_email: user.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: plan.priceMonthly,
      currency_id: "ARS",
    },
    back_url: `${baseUrl}/suscripcion/exito`,
    status: "pending",
  };

  const mpRes = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!mpRes.ok) {
    const err = await mpRes.text();
    req.log.error({ status: mpRes.status, body: err }, "MP preapproval creation failed");
    res.status(502).json({ error: "No se pudo crear la suscripción en Mercado Pago. Intentá de nuevo." });
    return;
  }

  const mpData = await mpRes.json() as { id: string; init_point: string; sandbox_init_point?: string };

  // Store the MP preapproval ID on the subscription record
  const [existing] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, prof.id))
    .limit(1);

  if (existing) {
    await db.update(subscriptionsTable)
      .set({ mpPreapprovalId: mpData.id, planSlug, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, existing.id));
  }

  res.json({
    checkoutUrl: mpData.init_point,
    sandboxCheckoutUrl: mpData.sandbox_init_point ?? null,
  });
});

/** MP webhook — no auth required, MP calls this endpoint */
router.post("/mp/webhook", async (req, res) => {
  const token = getMpAccessToken();
  if (!token) { res.json({ ok: true }); return; }

  try {
    const { type, data } = req.body as { type: string; data?: { id?: string } };

    if (type === "subscription_preapproval" && data?.id) {
      const preapprovalId = data.id;

      // Fetch subscription details from MP
      const mpRes = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!mpRes.ok) { res.json({ ok: true }); return; }

      const preapproval = await mpRes.json() as {
        id: string;
        status: string;
        external_reference?: string;
        auto_recurring?: { transaction_amount?: number };
      };

      // Find subscription by MP preapproval ID
      const [sub] = await db.select().from(subscriptionsTable)
        .where(eq(subscriptionsTable.mpPreapprovalId, preapprovalId))
        .limit(1);

      if (!sub) { res.json({ ok: true }); return; }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (preapproval.status === "authorized") {
        // Payment authorized — activate subscription
        await db.update(subscriptionsTable)
          .set({
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionsTable.id, sub.id));

        await db.update(professionalsTable)
          .set({ status: "active", currentPlan: sub.planSlug, updatedAt: new Date() })
          .where(eq(professionalsTable.id, sub.professionalId));

      } else if (preapproval.status === "cancelled" || preapproval.status === "paused") {
        // Payment failed/cancelled — suspend
        await db.update(subscriptionsTable)
          .set({ status: "past_due", cancelAtPeriodEnd: true, updatedAt: new Date() })
          .where(eq(subscriptionsTable.id, sub.id));

        await db.update(professionalsTable)
          .set({ status: "suspended", updatedAt: new Date() })
          .where(eq(professionalsTable.id, sub.professionalId));
      }
    }

    // Also handle payment notifications
    if (type === "payment" && data?.id) {
      const pmtRes = await fetch(`${MP_API}/v1/payments/${data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pmtRes.ok) {
        const pmt = await pmtRes.json() as {
          status: string;
          external_reference?: string;
          preapproval_id?: string;
        };

        if (pmt.preapproval_id) {
          const [sub] = await db.select().from(subscriptionsTable)
            .where(eq(subscriptionsTable.mpPreapprovalId, pmt.preapproval_id))
            .limit(1);

          if (sub && pmt.status === "approved") {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            await db.update(subscriptionsTable)
              .set({ status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, updatedAt: new Date() })
              .where(eq(subscriptionsTable.id, sub.id));

            await db.update(professionalsTable)
              .set({ status: "active", currentPlan: sub.planSlug, updatedAt: new Date() })
              .where(eq(professionalsTable.id, sub.professionalId));
          }
        }
      }
    }
  } catch (err) {
    // Never crash on webhook errors
  }

  res.json({ ok: true });
});

export default router;
