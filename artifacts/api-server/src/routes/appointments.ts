import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, professionalsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { UpdateAppointmentBody } from "@workspace/api-zod";
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

  const { date, status, startDate, endDate } = req.query;
  let conditions = [eq(appointmentsTable.professionalId, prof.id)];

  if (date) conditions.push(eq(appointmentsTable.date, String(date)));
  if (status) conditions.push(eq(appointmentsTable.status, String(status) as typeof appointmentsTable.status._.data));
  if (startDate) conditions.push(gte(appointmentsTable.date, String(startDate)));
  if (endDate) conditions.push(lte(appointmentsTable.date, String(endDate)));

  const appointments = await db.select().from(appointmentsTable)
    .where(and(...conditions))
    .orderBy(appointmentsTable.date, appointmentsTable.startTime);

  res.json(appointments);
});

router.get("/:appointmentId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.appointmentId));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [appointment] = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.professionalId, prof.id)))
    .limit(1);

  if (!appointment) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(appointment);
});

router.patch("/:appointmentId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.appointmentId));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(appointmentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.professionalId, prof.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(updated);
});

router.delete("/:appointmentId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.appointmentId));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(appointmentsTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.professionalId, prof.id)));

  res.status(204).send();
});

export default router;
