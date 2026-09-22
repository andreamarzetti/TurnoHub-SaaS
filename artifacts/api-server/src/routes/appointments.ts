import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, professionalsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { UpdateAppointmentBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  sendEmail,
  emailBookingConfirmedClient,
  emailBookingCancelledClient,
  emailBookingCancelledProf,
} from "../lib/email";

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
  const conditions = [eq(appointmentsTable.professionalId, prof.id)];

  if (date) conditions.push(eq(appointmentsTable.date, String(date)));
  if (status) conditions.push(eq(appointmentsTable.status, String(status) as typeof appointmentsTable.status._.data));
  if (startDate) conditions.push(gte(appointmentsTable.date, String(startDate)));
  if (endDate) conditions.push(lte(appointmentsTable.date, String(endDate)));

  const appointments = await db.select().from(appointmentsTable)
    .where(and(...conditions))
    .orderBy(appointmentsTable.date, appointmentsTable.startTime);

  res.json(appointments.map(a => ({
    ...a,
    paymentAmount: a.paymentAmount ? Number(a.paymentAmount) : null,
  })));
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
  res.json({ ...appointment, paymentAmount: appointment.paymentAmount ? Number(appointment.paymentAmount) : null });
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

  // Load previous state to detect status changes
  const [before] = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.professionalId, prof.id)))
    .limit(1);

  if (!before) { res.status(404).json({ error: "Appointment not found" }); return; }

  const [updated] = await db.update(appointmentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.professionalId, prof.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Appointment not found" }); return; }

  // ── Send email notifications on status changes ──
  const newStatus = parsed.data.status;
  if (newStatus && newStatus !== before.status) {
    const emailData = {
      clientName: updated.clientName,
      clientEmail: updated.clientEmail,
      profName: prof.name,
      profEmail: prof.email,
      profPhone: prof.phone,
      serviceName: updated.serviceName,
      date: updated.date,
      startTime: updated.startTime,
      price: 0, // not needed for status change emails
    };

    if (newStatus === "confirmed") {
      const { subject, html } = emailBookingConfirmedClient(emailData);
      sendEmail(updated.clientEmail, subject, html);
    }

    if (newStatus === "cancelled") {
      const { subject: cs, html: ch } = emailBookingCancelledClient(emailData);
      const { subject: ps, html: ph } = emailBookingCancelledProf(emailData);
      sendEmail(updated.clientEmail, cs, ch);
      sendEmail(prof.email, ps, ph);
    }
  }

  res.json({ ...updated, paymentAmount: updated.paymentAmount ? Number(updated.paymentAmount) : null });
});

router.delete("/:appointmentId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.appointmentId));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  // Load appointment before cancelling (for email)
  const [apt] = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.professionalId, prof.id)))
    .limit(1);

  if (!apt) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(appointmentsTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.professionalId, prof.id)));

  // Send cancellation emails
  const emailData = {
    clientName: apt.clientName,
    clientEmail: apt.clientEmail,
    profName: prof.name,
    profEmail: prof.email,
    profPhone: prof.phone,
    serviceName: apt.serviceName,
    date: apt.date,
    startTime: apt.startTime,
    price: 0,
  };

  const { subject: cs, html: ch } = emailBookingCancelledClient(emailData);
  const { subject: ps, html: ph } = emailBookingCancelledProf(emailData);
  sendEmail(apt.clientEmail, cs, ch);
  sendEmail(prof.email, ps, ph);

  res.status(204).send();
});

export default router;
