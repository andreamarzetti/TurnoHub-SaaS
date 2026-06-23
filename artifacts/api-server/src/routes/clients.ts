import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, appointmentsTable, professionalsTable, usersTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function getProfessionalForUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [prof] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  return prof || null;
}

router.get("/", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const { search } = req.query;

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
    .where(
      search
        ? and(eq(clientsTable.professionalId, prof.id), ilike(clientsTable.name, `%${search}%`))
        : eq(clientsTable.professionalId, prof.id)
    )
    .groupBy(clientsTable.id)
    .orderBy(clientsTable.name);

  res.json(rows);
});

router.get("/:clientId", requireAuth, async (req, res) => {
  const clientId = parseInt(String(req.params.clientId));
  if (isNaN(clientId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.professionalId, prof.id)))
    .limit(1);

  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const appointments = await db.select().from(appointmentsTable)
    .where(eq(appointmentsTable.clientId, clientId))
    .orderBy(appointmentsTable.date);

  const totalAppointments = appointments.length;
  const lastAppointmentAt = appointments.length > 0
    ? appointments[appointments.length - 1].createdAt?.toISOString() ?? null
    : null;

  res.json({ ...client, totalAppointments, lastAppointmentAt, appointments });
});

export default router;
