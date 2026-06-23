import { Router } from "express";
import { db } from "@workspace/db";
import { professionalsTable, appointmentsTable, subscriptionsTable, usersTable } from "@workspace/db";
import { eq, and, ilike, sql, gte } from "drizzle-orm";
import { UpdateProfessionalStatusBody, UpdateProfessionalPlanBody } from "@workspace/api-zod";
import { requireRole } from "../middlewares/auth";

const router = Router();

router.get("/stats", requireRole("super_admin"), async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.toISOString().split("T")[0];

  const [totalProfs] = await db.select({ count: sql<number>`count(*)::int` }).from(professionalsTable);
  const [activeProfs] = await db.select({ count: sql<number>`count(*)::int` })
    .from(professionalsTable).where(eq(professionalsTable.status, "active"));
  const [trialProfs] = await db.select({ count: sql<number>`count(*)::int` })
    .from(professionalsTable).where(eq(professionalsTable.status, "trial"));
  const [suspendedProfs] = await db.select({ count: sql<number>`count(*)::int` })
    .from(professionalsTable).where(eq(professionalsTable.status, "suspended"));
  const [todayAppts] = await db.select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable).where(eq(appointmentsTable.date, today));
  const [newThisMonth] = await db.select({ count: sql<number>`count(*)::int` })
    .from(professionalsTable).where(gte(professionalsTable.createdAt, startOfMonth));

  const activeSubs = await db.select({ planSlug: subscriptionsTable.planSlug })
    .from(subscriptionsTable).where(eq(subscriptionsTable.status, "active"));

  const PLAN_PRICES: Record<string, number> = { basico: 9900, profesional: 14900, premium: 19900 };
  const revenueThisMonth = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.planSlug] ?? 0), 0);

  res.json({
    totalProfessionals: totalProfs?.count ?? 0,
    activeProfessionals: activeProfs?.count ?? 0,
    totalAppointmentsToday: todayAppts?.count ?? 0,
    totalRevenueThisMonth: revenueThisMonth,
    newProfessionalsThisMonth: newThisMonth?.count ?? 0,
    trialProfessionals: trialProfs?.count ?? 0,
    suspendedProfessionals: suspendedProfs?.count ?? 0,
  });
});

router.get("/professionals", requireRole("super_admin"), async (req, res) => {
  const { status, search } = req.query;

  let conditions = [];
  if (status) conditions.push(eq(professionalsTable.status, String(status) as typeof professionalsTable.status._.data));
  if (search) conditions.push(ilike(professionalsTable.name, `%${search}%`));

  const rows = await db
    .select({
      id: professionalsTable.id,
      name: professionalsTable.name,
      email: professionalsTable.email,
      profession: professionalsTable.profession,
      status: professionalsTable.status,
      currentPlan: professionalsTable.currentPlan,
      trialEndsAt: professionalsTable.trialEndsAt,
      createdAt: professionalsTable.createdAt,
      totalAppointments: sql<number>`count(${appointmentsTable.id})::int`,
    })
    .from(professionalsTable)
    .leftJoin(appointmentsTable, eq(appointmentsTable.professionalId, professionalsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(professionalsTable.id)
    .orderBy(professionalsTable.createdAt);

  res.json(rows.map(r => ({ ...r, totalClients: 0 })));
});

router.patch("/professionals/:professionalId/status", requireRole("super_admin"), async (req, res) => {
  const id = parseInt(String(req.params.professionalId));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateProfessionalStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const [updated] = await db.update(professionalsTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(professionalsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, totalAppointments: 0, totalClients: 0 });
});

router.patch("/professionals/:professionalId/plan", requireRole("super_admin"), async (req, res) => {
  const id = parseInt(String(req.params.professionalId));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateProfessionalPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const [updated] = await db.update(professionalsTable)
    .set({ currentPlan: parsed.data.plan, updatedAt: new Date() })
    .where(eq(professionalsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, totalAppointments: 0, totalClients: 0 });
});

export default router;
