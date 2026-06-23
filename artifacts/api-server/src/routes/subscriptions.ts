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
      "Integración con Mercado Pago",
      "Reportes y estadísticas",
    ],
  },
];

async function getProfessionalForUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [prof] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  return prof || null;
}

router.get("/plans", async (_req, res) => {
  res.json(PLANS);
});

router.get("/me", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

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

export default router;
