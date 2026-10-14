import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, professionalsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateSubscriptionBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sendEmail, emailSubscriptionActivated } from "../lib/email";
import { getPublicAppUrl } from "../lib/app-url";

const router = Router();

export const PLANS = [
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
      "Recordatorios por email",
      "Reprogramar y cancelar turnos",
      "Historial completo de clientes",
      "Configuración de redes sociales",
      "Cobro de reservas con Mercado Pago",
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
      "Reportes y estadísticas completas",
    ],
  },
];

const MP_API = "https://api.mercadopago.com";

function getMpToken(): string | null {
  return process.env.MP_ACCESS_TOKEN || null;
}

async function getProfessionalForUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return { user: null, prof: null };
  const [prof] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  return { user, prof: prof || null };
}

/** Auto-expire trial subscriptions */
async function checkAndExpireTrial(professionalId: number) {
  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, professionalId))
    .limit(1);
  if (!sub) return;

  const now = new Date();
  if ((sub.status === "trial" || sub.status === "active") && sub.currentPeriodEnd <= now) {
    const expiredStatus = sub.cancelAtPeriodEnd ? "cancelled" : "past_due";
    await db.update(subscriptionsTable)
      .set({ status: expiredStatus, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, sub.id));
    await db.update(professionalsTable)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(professionalsTable.id, professionalId));
  }
}

// GET /plans
router.get("/plans", async (_req, res) => {
  res.json(PLANS);
});

// GET /me — current subscription
router.get("/me", requireAuth, async (req, res) => {
  const { prof } = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  await checkAndExpireTrial(prof.id);

  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, prof.id))
    .limit(1);

  if (!sub) { res.status(404).json({ error: "No subscription found" }); return; }
  res.json(sub);
});

// POST /me — direct activation (admin/internal use)
router.post("/me", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = CreateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { prof } = await getProfessionalForUser(req.session.userId!);
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

// POST /me/cancel
router.post("/me/cancel", requireAuth, async (req, res) => {
  const { prof } = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [existing] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, prof.id))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "No subscription found" }); return; }

  const token = getMpToken();
  if (existing.mpPreapprovalId && !token) {
    res.status(503).json({ error: "Mercado Pago no está configurado." });
    return;
  }

  const [pendingCancellation] = await db.update(subscriptionsTable)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptionsTable.id, existing.id))
    .returning();

  if (existing.mpPreapprovalId && token) {
    const mpRes = await fetch(`${MP_API}/preapproval/${encodeURIComponent(existing.mpPreapprovalId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!mpRes.ok) {
      console.error("[MP subscription cancel] cancellation failed:", mpRes.status, await mpRes.text());
      await db.update(subscriptionsTable)
        .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
        .where(eq(subscriptionsTable.id, existing.id));
      res.status(502).json({ error: "Mercado Pago no pudo cancelar la renovación. No se modificó la suscripción." });
      return;
    }
  }

  res.json(pendingCancellation);
});

// ─── Mercado Pago Checkout ────────────────────────────────────────────────────

/** POST /mp/checkout — creates MP preapproval and returns checkout URL */
router.post("/mp/checkout", requireAuth, async (req, res) => {
  const token = getMpToken();
  if (!token) {
    res.status(503).json({ error: "Mercado Pago no está configurado. Contactá al administrador." });
    return;
  }

  const { planSlug } = req.body as { planSlug?: string };
  const plan = PLANS.find(p => p.slug === planSlug);
  if (!plan) { res.status(400).json({ error: "Plan inválido" }); return; }

  const { user, prof } = await getProfessionalForUser(req.session.userId!);
  if (!prof || !user) { res.status(404).json({ error: "Not found" }); return; }

  const baseUrl = getPublicAppUrl();
  if (!baseUrl) {
    res.status(503).json({ error: "La URL pública HTTPS de TurnoHub no está configurada." });
    return;
  }

  // ── Step 1: Ensure a subscription row exists (so webhook can find it by mpPreapprovalId) ──
  let sub;
  const [existing] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, prof.id))
    .limit(1);

  if (existing) {
    if (existing.mpPreapprovalId && existing.status === "active") {
      res.status(409).json({ error: "Ya hay una suscripción activa. Cancelala antes de iniciar otra para evitar cobros duplicados." });
      return;
    }
    if (existing.mpPreapprovalId) {
      const cancelPending = await fetch(`${MP_API}/preapproval/${encodeURIComponent(existing.mpPreapprovalId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!cancelPending.ok) {
        console.error("[MP checkout] could not replace pending preapproval:", cancelPending.status, await cancelPending.text());
        res.status(502).json({ error: "No se pudo cancelar el checkout anterior. No se creó otra suscripción." });
        return;
      }
    }
    [sub] = await db.update(subscriptionsTable)
      .set({ planSlug: plan.slug, status: "trial", mpPreapprovalId: null, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, existing.id))
      .returning();
  } else {
    // Create a new subscription row (stays as trial until webhook activates it)
    const now = new Date();
    const periodEnd = prof.trialEndsAt ?? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    [sub] = await db.insert(subscriptionsTable).values({
      professionalId: prof.id,
      planSlug: plan.slug,
      status: "trial",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    }).returning();
  }

  // ── Step 2: Create MP preapproval ──
  const selectedPlanSlug = plan.slug;
  const externalRef = `sub_${sub.id}_prof_${prof.id}`;
  const payload = {
    reason: `Plan ${plan.name} — TurnoHub`,
    external_reference: externalRef,
    payer_email: user.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: plan.priceMonthly,
      currency_id: "ARS",
    },
    back_url: `${baseUrl}/suscripcion/exito`,
    notification_url: `${baseUrl}/api/subscriptions/mp/webhook`,
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
    console.error("[MP checkout] preapproval creation failed:", mpRes.status, err);
    res.status(502).json({ error: "No se pudo crear la suscripción en Mercado Pago. Intentá de nuevo." });
    return;
  }

  const mpData = await mpRes.json() as { id: string; init_point: string; sandbox_init_point?: string };

  // ── Step 3: Store mpPreapprovalId so webhook can find the subscription ──
  await db.update(subscriptionsTable)
    .set({ mpPreapprovalId: mpData.id, planSlug: selectedPlanSlug, updatedAt: new Date() })
    .where(eq(subscriptionsTable.id, sub.id));

  res.json({
    checkoutUrl: mpData.init_point,
    sandboxCheckoutUrl: mpData.sandbox_init_point ?? null,
  });
});

// ─── Mercado Pago Webhook ─────────────────────────────────────────────────────

/** POST /mp/webhook — called by Mercado Pago (no auth required) */
router.post("/mp/webhook", async (req, res) => {
  const token = getMpToken();
  if (!token) {
    res.status(503).json({ error: "Mercado Pago no está configurado." });
    return;
  }

  try {
    const body = req.body as { type?: string; data?: { id?: string } };
    const { type, data } = body;

    // ── Handle subscription preapproval status changes ──
    if (type === "subscription_preapproval" && data?.id) {
      await handlePreapprovalEvent(data.id, token);
    }

    // ── Handle individual payments (recurring charges) ──
    if (type === "payment" && data?.id) {
      await handlePaymentEvent(data.id, token);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[MP webhook] error:", err);
    res.status(500).json({ error: "No se pudo procesar la notificación." });
  }
});

async function handlePreapprovalEvent(preapprovalId: string, token: string) {
  // Fetch preapproval details from MP
  const mpRes = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!mpRes.ok) throw new Error(`Mercado Pago preapproval lookup failed: ${mpRes.status}`);

  const preapproval = await mpRes.json() as {
    id: string;
    status: string;
    external_reference?: string;
    payer_id?: number;
  };

  // Find subscription: first by mpPreapprovalId, fallback by external_reference
  let sub;
  const [byMpId] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.mpPreapprovalId, preapprovalId))
    .limit(1);

  if (byMpId) {
    sub = byMpId;
  } else if (preapproval.external_reference) {
    // Parse external_reference format: "sub_{id}_prof_{profId}"
    const match = preapproval.external_reference.match(/^sub_(\d+)/);
    if (match) {
      const subId = parseInt(match[1]);
      const [byRef] = await db.select().from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, subId))
        .limit(1);
      if (byRef) sub = byRef;
    }
  }

  if (!sub) {
    console.warn("[MP webhook] preapproval not found:", preapprovalId, preapproval.external_reference);
    return;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (preapproval.status === "authorized") {
    // ── Activate subscription ──
    await db.update(subscriptionsTable)
      .set({
        status: "active",
        mpPreapprovalId: preapprovalId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.id, sub.id));

    await db.update(professionalsTable)
      .set({ status: "active", currentPlan: sub.planSlug, updatedAt: new Date() })
      .where(eq(professionalsTable.id, sub.professionalId));

    // Send activation email
    const [prof] = await db.select().from(professionalsTable)
      .where(eq(professionalsTable.id, sub.professionalId))
      .limit(1);
    if (prof) {
      const plan = PLANS.find(p => p.slug === sub.planSlug);
      const { subject, html } = emailSubscriptionActivated(prof.name, prof.email, plan?.name ?? sub.planSlug);
      sendEmail(prof.email, subject, html);
    }

  } else if (preapproval.status === "cancelled" || preapproval.status === "paused") {
    if (preapproval.status === "cancelled" && sub.cancelAtPeriodEnd && sub.currentPeriodEnd > now) {
      await db.update(subscriptionsTable)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptionsTable.id, sub.id));
      return;
    }

    // ── Suspend subscription ──
    await db.update(subscriptionsTable)
      .set({ status: "past_due", cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, sub.id));

    await db.update(professionalsTable)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(professionalsTable.id, sub.professionalId));
  }
}

async function handlePaymentEvent(paymentId: string, token: string) {
  const pmtRes = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pmtRes.ok) throw new Error(`Mercado Pago payment lookup failed: ${pmtRes.status}`);

  const pmt = await pmtRes.json() as {
    status: string;
    preapproval_id?: string;
    external_reference?: string;
  };

  // Find subscription via preapproval_id
  let sub;
  if (pmt.preapproval_id) {
    const [byMpId] = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.mpPreapprovalId, pmt.preapproval_id))
      .limit(1);
    if (byMpId) sub = byMpId;
  }

  if (!sub) return;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (pmt.status === "approved") {
    // ── Renewal payment approved ──
    await db.update(subscriptionsTable)
      .set({ status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, sub.id));

    await db.update(professionalsTable)
      .set({ status: "active", currentPlan: sub.planSlug, updatedAt: new Date() })
      .where(eq(professionalsTable.id, sub.professionalId));

  } else if (pmt.status === "rejected" || pmt.status === "cancelled") {
    // ── Payment failed ──
    await db.update(subscriptionsTable)
      .set({ status: "past_due", updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, sub.id));

    await db.update(professionalsTable)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(professionalsTable.id, sub.professionalId));
  }
}

export default router;
