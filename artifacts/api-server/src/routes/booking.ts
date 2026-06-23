import { Router } from "express";
import { db } from "@workspace/db";
import { professionalsTable, servicesTable, availabilitySlotsTable, appointmentsTable, clientsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateBookingBody } from "@workspace/api-zod";

const router = Router();

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const [prof] = await db.select().from(professionalsTable)
    .where(and(eq(professionalsTable.slug, slug), eq(professionalsTable.status, "active")))
    .limit(1);

  if (!prof) { res.status(404).json({ error: "Professional not found" }); return; }

  const services = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.professionalId, prof.id), eq(servicesTable.isActive, true)));

  const { passwordHash: _, userId: __, ...profOut } = prof as typeof prof & { passwordHash?: string };

  res.json({
    id: prof.id,
    name: prof.name,
    profession: prof.profession,
    slug: prof.slug,
    bio: prof.bio,
    avatarUrl: prof.avatarUrl,
    city: prof.city,
    phone: prof.phone,
    whatsappNumber: prof.whatsappNumber,
    instagramUrl: prof.instagramUrl,
    services: services.map(s => ({ ...s, price: Number(s.price) })),
  });
});

router.get("/:slug/slots", async (req, res) => {
  const { slug } = req.params;
  const { date, serviceId } = req.query;

  if (!date || !serviceId) {
    res.status(400).json({ error: "date and serviceId are required" });
    return;
  }

  const [prof] = await db.select().from(professionalsTable)
    .where(and(eq(professionalsTable.slug, slug), eq(professionalsTable.status, "active")))
    .limit(1);

  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [service] = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.id, parseInt(String(serviceId))), eq(servicesTable.professionalId, prof.id)))
    .limit(1);

  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const dateObj = new Date(String(date));
  const dayOfWeek = dateObj.getDay();

  const availSlots = await db.select().from(availabilitySlotsTable)
    .where(and(
      eq(availabilitySlotsTable.professionalId, prof.id),
      eq(availabilitySlotsTable.dayOfWeek, dayOfWeek),
      eq(availabilitySlotsTable.isActive, true)
    ));

  if (availSlots.length === 0) {
    res.json([]);
    return;
  }

  const bookedAppts = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.professionalId, prof.id),
      eq(appointmentsTable.date, String(date)),
      eq(appointmentsTable.status, "confirmed")
    ));

  const slots: { startTime: string; endTime: string; available: boolean }[] = [];
  const duration = service.duration;

  for (const avail of availSlots) {
    let current = avail.startTime;
    while (true) {
      const next = addMinutes(current, duration);
      if (timeToMinutes(next) > timeToMinutes(avail.endTime)) break;

      const isBooked = bookedAppts.some(a =>
        timeToMinutes(a.startTime) < timeToMinutes(next) &&
        timeToMinutes(a.endTime) > timeToMinutes(current)
      );

      slots.push({ startTime: current, endTime: next, available: !isBooked });
      current = next;
    }
  }

  res.json(slots);
});

router.post("/:slug/book", async (req, res) => {
  const { slug } = req.params;

  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const [prof] = await db.select().from(professionalsTable)
    .where(and(eq(professionalsTable.slug, slug), eq(professionalsTable.status, "active")))
    .limit(1);

  if (!prof) { res.status(404).json({ error: "Professional not found" }); return; }

  const [service] = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.id, parsed.data.serviceId), eq(servicesTable.professionalId, prof.id)))
    .limit(1);

  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const endTime = addMinutes(parsed.data.startTime, service.duration);

  const conflict = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.professionalId, prof.id),
      eq(appointmentsTable.date, parsed.data.date),
      eq(appointmentsTable.startTime, parsed.data.startTime),
      eq(appointmentsTable.status, "confirmed")
    ))
    .limit(1);

  if (conflict.length > 0) {
    res.status(409).json({ error: "This time slot is no longer available" });
    return;
  }

  let [client] = await db.select().from(clientsTable)
    .where(and(
      eq(clientsTable.email, parsed.data.clientEmail),
      eq(clientsTable.professionalId, prof.id)
    ))
    .limit(1);

  if (!client) {
    [client] = await db.insert(clientsTable).values({
      professionalId: prof.id,
      name: parsed.data.clientName,
      email: parsed.data.clientEmail,
      phone: parsed.data.clientPhone ?? null,
    }).returning();
  }

  const [appointment] = await db.insert(appointmentsTable).values({
    professionalId: prof.id,
    serviceId: service.id,
    serviceName: service.name,
    clientId: client.id,
    clientName: parsed.data.clientName,
    clientEmail: parsed.data.clientEmail,
    clientPhone: parsed.data.clientPhone ?? null,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    endTime,
    status: "pending",
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json(appointment);
});

export default router;
