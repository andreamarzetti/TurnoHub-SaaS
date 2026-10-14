import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, clientsTable, professionalsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { requireSubscriptionAccess } from "../middlewares/subscription-access";

const router = Router();
router.use(requireSubscriptionAccess);

async function getProfessionalForUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [prof] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  return prof || null;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

router.get("/summary", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const today = formatDate(new Date());
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [todayCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.professionalId, prof.id), eq(appointmentsTable.date, today)));

  const [weekCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.professionalId, prof.id),
      gte(appointmentsTable.date, formatDate(startOfWeek)),
      lte(appointmentsTable.date, formatDate(endOfWeek))
    ));

  const [clientCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(clientsTable)
    .where(eq(clientsTable.professionalId, prof.id));

  const [pendingCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.professionalId, prof.id), eq(appointmentsTable.status, "pending")));

  const [completedCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.professionalId, prof.id),
      eq(appointmentsTable.status, "completed"),
      gte(appointmentsTable.date, formatDate(startOfMonth)),
      lte(appointmentsTable.date, formatDate(endOfMonth))
    ));

  const [cancelledCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.professionalId, prof.id),
      eq(appointmentsTable.status, "cancelled"),
      gte(appointmentsTable.date, formatDate(startOfMonth)),
      lte(appointmentsTable.date, formatDate(endOfMonth))
    ));

  const totalMonth = (completedCount?.count ?? 0) + (cancelledCount?.count ?? 0);
  const cancellationRate = totalMonth > 0
    ? Math.round(((cancelledCount?.count ?? 0) / totalMonth) * 100)
    : 0;

  res.json({
    totalAppointmentsToday: todayCount?.count ?? 0,
    totalAppointmentsThisWeek: weekCount?.count ?? 0,
    totalClients: clientCount?.count ?? 0,
    pendingAppointments: pendingCount?.count ?? 0,
    completedThisMonth: completedCount?.count ?? 0,
    cancellationRate,
  });
});

router.get("/upcoming", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const limit = Math.min(parseInt(String(req.query.limit ?? "5")), 20);
  const today = formatDate(new Date());

  const appointments = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.professionalId, prof.id),
      gte(appointmentsTable.date, today),
      sql`${appointmentsTable.status} NOT IN ('cancelled', 'completed')`
    ))
    .orderBy(appointmentsTable.date, appointmentsTable.startTime)
    .limit(limit);

  res.json(appointments);
});

router.get("/recent-clients", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const rows = await db
    .select({
      id: clientsTable.id,
      professionalId: clientsTable.professionalId,
      name: clientsTable.name,
      email: clientsTable.email,
      phone: clientsTable.phone,
      createdAt: clientsTable.createdAt,
      totalAppointments: sql<number>`count(${appointmentsTable.id})::int`,
      lastAppointmentAt: sql<string | null>`max(${appointmentsTable.createdAt})`,
    })
    .from(clientsTable)
    .leftJoin(appointmentsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .where(eq(clientsTable.professionalId, prof.id))
    .groupBy(clientsTable.id)
    .orderBy(desc(sql`max(${appointmentsTable.createdAt})`))
    .limit(5);

  res.json(rows);
});

router.get("/appointments-by-day", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const result = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = formatDate(d);
    const dayLabel = DAY_LABELS[d.getDay()];

    const [row] = await db.select({ count: sql<number>`count(*)::int` })
      .from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.professionalId, prof.id),
        eq(appointmentsTable.date, dateStr)
      ));

    result.push({ date: dateStr, dayLabel, count: row?.count ?? 0 });
  }

  res.json(result);
});

export default router;
