import { Router } from "express";
import { db } from "@workspace/db";
import { professionalsTable, servicesTable, availabilitySlotsTable, appointmentsTable, clientsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
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

async function sendEmailNotification(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TurnoHub <turnos@turnohub.app>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
  } catch {
    // non-critical — booking already saved
  }
}

router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const [prof] = await db.select().from(professionalsTable)
    .where(and(eq(professionalsTable.slug, String(slug)), eq(professionalsTable.status, "active")))
    .limit(1);

  if (!prof) { res.status(404).json({ error: "Professional not found" }); return; }

  const services = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.professionalId, prof.id), eq(servicesTable.isActive, true)));

  res.json({
    id: prof.id,
    name: prof.name,
    profession: prof.profession,
    slug: prof.slug,
    bio: prof.bio,
    avatarUrl: prof.avatarUrl,
    city: prof.city,
    phone: prof.phone,
    address: prof.address ?? null,
    whatsappNumber: prof.whatsappNumber,
    instagramUrl: prof.instagramUrl,
    facebookUrl: prof.facebookUrl ?? null,
    websiteUrl: prof.websiteUrl ?? null,
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
    .where(and(eq(professionalsTable.slug, String(slug)), eq(professionalsTable.status, "active")))
    .limit(1);

  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [service] = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.id, parseInt(String(serviceId))), eq(servicesTable.professionalId, prof.id)))
    .limit(1);

  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const dateObj = new Date(String(date) + "T12:00:00");
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

  // Check both pending AND confirmed — don't let two people book the same slot
  const bookedAppts = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.professionalId, prof.id),
      eq(appointmentsTable.date, String(date)),
      or(
        eq(appointmentsTable.status, "confirmed"),
        eq(appointmentsTable.status, "pending")
      )
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
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }

  const [prof] = await db.select().from(professionalsTable)
    .where(and(eq(professionalsTable.slug, String(slug)), eq(professionalsTable.status, "active")))
    .limit(1);

  if (!prof) { res.status(404).json({ error: "Profesional no encontrado" }); return; }

  const [service] = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.id, parsed.data.serviceId), eq(servicesTable.professionalId, prof.id)))
    .limit(1);

  if (!service) { res.status(404).json({ error: "Servicio no encontrado" }); return; }

  const endTime = addMinutes(parsed.data.startTime, service.duration);

  // Check for conflicts — both pending AND confirmed
  const conflict = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.professionalId, prof.id),
      eq(appointmentsTable.date, parsed.data.date),
      eq(appointmentsTable.startTime, parsed.data.startTime),
      or(
        eq(appointmentsTable.status, "confirmed"),
        eq(appointmentsTable.status, "pending")
      )
    ))
    .limit(1);

  if (conflict.length > 0) {
    res.status(409).json({ error: "Este horario ya no está disponible. Por favor, elegí otro." });
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
    status: "confirmed",
    notes: parsed.data.notes ?? null,
  }).returning();

  // WhatsApp link for professional notification
  const whatsappPhone = (prof.whatsappNumber || prof.phone || "").replace(/\D/g, "");
  const waMsgRaw = `Nuevo turno reservado! 📅\nCliente: ${parsed.data.clientName}\nServicio: ${service.name}\nFecha: ${parsed.data.date}\nHora: ${parsed.data.startTime.substring(0, 5)}`;
  const waUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(waMsgRaw)}`
    : null;

  // Email to client (fire and forget)
  const formattedDate = new Date(parsed.data.date + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const clientEmailHtml = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
      <div style="background:#14B8A6;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:22px">✅ ¡Turno confirmado!</h1>
      </div>
      <p style="color:#374151;">Hola <strong>${parsed.data.clientName}</strong>, tu turno fue reservado correctamente.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:6px 0;color:#374151;"><strong>Profesional:</strong> ${prof.name}</p>
        <p style="margin:6px 0;color:#374151;"><strong>Servicio:</strong> ${service.name}</p>
        <p style="margin:6px 0;color:#374151;"><strong>Fecha:</strong> ${formattedDate}</p>
        <p style="margin:6px 0;color:#374151;"><strong>Hora:</strong> ${parsed.data.startTime.substring(0, 5)}</p>
        ${parsed.data.notes ? `<p style="margin:6px 0;color:#374151;"><strong>Nota:</strong> ${parsed.data.notes}</p>` : ""}
      </div>
      ${waUrl ? `<p style="color:#374151;">Podés contactar al profesional por <a href="${waUrl}" style="color:#14B8A6">WhatsApp</a>.</p>` : ""}
      <p style="color:#9ca3af;font-size:13px;margin-top:24px">TurnoHub · Sistema de turnos online</p>
    </div>
  `;

  sendEmailNotification({
    to: parsed.data.clientEmail,
    subject: `✅ Turno confirmado con ${prof.name} — ${parsed.data.date}`,
    html: clientEmailHtml,
  });

  res.status(201).json({ ...appointment, waUrl });
});

export default router;
