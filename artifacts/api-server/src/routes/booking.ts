import { Router } from "express";
import { db } from "@workspace/db";
import { professionalsTable, servicesTable, availabilitySlotsTable, appointmentsTable, clientsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { CreateBookingBody } from "@workspace/api-zod";
import {
  sendEmail,
  emailBookingCreatedClient,
  emailBookingCreatedProf,
  emailPaymentReceivedClient,
  emailPaymentReceivedProf,
} from "../lib/email";

const router = Router();
const MP_API = "https://api.mercadopago.com";

function getBaseUrl(): string {
  const domains = (process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "localhost:80").split(",")[0];
  return `https://${domains}`;
}

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

/** Calculate how much to charge based on payment mode */
function calcPaymentAmount(price: number, paymentMode: string, depositPercent: number): number {
  if (paymentMode === "full") return Math.round(price);
  if (paymentMode === "deposit") return Math.round(price * depositPercent / 100);
  return 0;
}

/** Create a one-time MP payment preference using professional's own token */
async function createMpPreference(opts: {
  profToken: string;
  title: string;
  amount: number;
  clientName: string;
  clientEmail: string;
  externalRef: string;
  successUrl: string;
  failureUrl: string;
  notificationUrl: string;
}): Promise<{ initPoint: string; id: string } | null> {
  try {
    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.profToken}`,
      },
      body: JSON.stringify({
        items: [{
          title: opts.title,
          unit_price: opts.amount,
          quantity: 1,
          currency_id: "ARS",
        }],
        payer: {
          name: opts.clientName,
          email: opts.clientEmail,
        },
        back_urls: {
          success: opts.successUrl,
          failure: opts.failureUrl,
          pending: opts.successUrl + "&pending=1",
        },
        auto_return: "approved",
        notification_url: opts.notificationUrl,
        external_reference: opts.externalRef,
        expires: true,
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[MP preference] creation failed:", res.status, err);
      return null;
    }

    const data = await res.json() as { id: string; init_point: string };
    return { initPoint: data.init_point, id: data.id };
  } catch (err) {
    console.error("[MP preference] error:", err);
    return null;
  }
}

// ── GET /:slug — public profile ───────────────────────────────────────────────
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const [prof] = await db.select().from(professionalsTable)
    .where(and(eq(professionalsTable.slug, String(slug)), eq(professionalsTable.status, "active")))
    .limit(1);

  if (!prof) { res.status(404).json({ error: "Professional not found" }); return; }

  const services = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.professionalId, prof.id), eq(servicesTable.isActive, true)));

  // Determine if professional can accept online payments
  const canAcceptOnlinePayment = !!prof.mpAccessToken &&
    (prof.paymentMode === "full" || prof.paymentMode === "deposit");

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
    // Payment info for booking page
    paymentMode: canAcceptOnlinePayment ? prof.paymentMode : (prof.paymentMode === "in_person" ? "in_person" : "none"),
    depositPercent: prof.depositPercent ?? 30,
    services: services.map(s => ({ ...s, price: Number(s.price) })),
  });
});

// ── GET /:slug/slots — available time slots ───────────────────────────────────
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

  if (availSlots.length === 0) { res.json([]); return; }

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

// ── POST /:slug/book — create booking ────────────────────────────────────────
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

  // Check for conflicts
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

  // Upsert client
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

  // Determine payment mode and initial status
  const servicePrice = Number(service.price);
  const requiresOnlinePayment = !!prof.mpAccessToken &&
    (prof.paymentMode === "full" || prof.paymentMode === "deposit");

  const appointmentStatus = requiresOnlinePayment ? "pending" : "confirmed";
  const paymentStatus = requiresOnlinePayment ? "pending" : null;
  const paymentMode = prof.paymentMode || "none";

  // Create appointment
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
    status: appointmentStatus,
    notes: parsed.data.notes ?? null,
    paymentStatus,
    paymentMode,
  }).returning();

  const baseUrl = getBaseUrl();

  // WhatsApp link for professional
  const whatsappPhone = (prof.whatsappNumber || prof.phone || "").replace(/\D/g, "");
  const waMsg = `Nuevo turno reservado 📅\nCliente: ${parsed.data.clientName}\nServicio: ${service.name}\nFecha: ${parsed.data.date}\nHora: ${parsed.data.startTime.substring(0, 5)}`;
  const waUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(waMsg)}`
    : null;

  // Email data for templates
  const emailData = {
    clientName: parsed.data.clientName,
    clientEmail: parsed.data.clientEmail,
    profName: prof.name,
    profEmail: prof.email,
    profPhone: prof.phone,
    serviceName: service.name,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    price: servicePrice,
    paymentMode,
  };

  let paymentUrl: string | null = null;

  if (requiresOnlinePayment) {
    // ── Create MP payment preference ──
    const paymentAmount = calcPaymentAmount(servicePrice, prof.paymentMode, prof.depositPercent);
    const successUrl = `${baseUrl}/booking/${slug}?paid=1&apt=${appointment.id}`;
    const failureUrl = `${baseUrl}/booking/${slug}?error=pago&apt=${appointment.id}`;
    const notifUrl = `${baseUrl}/api/booking/mp/webhook`;

    const preference = await createMpPreference({
      profToken: prof.mpAccessToken!,
      title: `${service.name} — ${prof.name}`,
      amount: paymentAmount,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      externalRef: `apt_${appointment.id}`,
      successUrl,
      failureUrl,
      notificationUrl: notifUrl,
    });

    if (preference) {
      paymentUrl = preference.initPoint;
      // Update appointment with payment preference ID
      await db.update(appointmentsTable)
        .set({ paymentId: preference.id, updatedAt: new Date() })
        .where(eq(appointmentsTable.id, appointment.id));
    }
  }

  // Fire-and-forget emails
  const { subject: clientSubj, html: clientHtml } = emailBookingCreatedClient(emailData);
  const { subject: profSubj, html: profHtml } = emailBookingCreatedProf(emailData);
  sendEmail(parsed.data.clientEmail, clientSubj, clientHtml);
  sendEmail(prof.email, profSubj, profHtml);

  res.status(201).json({ ...appointment, waUrl, paymentUrl });
});

// ── POST /mp/webhook — MP payment webhook for bookings ────────────────────────
// Called by Mercado Pago when a client's booking payment is processed
router.post("/mp/webhook", async (req, res) => {
  // Always respond 200 immediately
  res.json({ ok: true });

  try {
    const body = req.body as {
      type?: string;
      user_id?: number | string;
      data?: { id?: string };
    };
    if (body.type !== "payment" || !body.data?.id) return;

    const paymentId = body.data.id;

    // Fetch payment details from MP
    // Note: we need to figure out which professional's token to use.
    // The external_reference is "apt_{appointmentId}", so we can look up the appointment
    // first using a system-level token (MP_ACCESS_TOKEN), or we can find the appointment
    // by payment_id and then use the professional's token.
    //
    // Strategy: look up by paymentId in appointments table first, then use prof token.
    // But on the initial webhook, paymentId isn't stored yet. We need to use a token.
    //
    // We'll iterate: try to find the payment using the platform token (MP_ACCESS_TOKEN).
    // The platform token can read any payment made through MP preferences created
    // using its child accounts (marketplace flow). If not available, try to find
    // the appointment by external_reference pattern.

    const platformToken = process.env.MP_ACCESS_TOKEN;

    // Try to fetch payment info using platform token
    let paymentData: { status?: string; external_reference?: string; transaction_amount?: number } | null = null;

    if (platformToken) {
      const pmtRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${platformToken}` },
      });
      if (pmtRes.ok) {
        paymentData = await pmtRes.json() as {
          status?: string;
          external_reference?: string;
          transaction_amount?: number;
        };
      }
    }

    // If platform token didn't work, we'll need to find the appointment via external_reference
    // from the webhook body (MP sometimes includes it)
    const extRef = (body as Record<string, unknown>).external_reference as string | undefined;
    const aptIdMatch = (paymentData?.external_reference || extRef || "").match(/^apt_(\d+)/);
    if (!aptIdMatch) {
      console.warn("[MP booking webhook] no external_reference found for payment:", paymentId);
      return;
    }

    const appointmentId = parseInt(aptIdMatch[1]);

    // Prefer the seller id sent by Mercado Pago to select the professional's
    // own OAuth token. This keeps booking charges completely separate from the
    // platform subscription token.
    if (!paymentData && body.user_id) {
      const [seller] = await db.select().from(professionalsTable)
        .where(eq(professionalsTable.mpUserId, String(body.user_id)))
        .limit(1);
      if (seller?.mpAccessToken) {
        const pmtRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${seller.mpAccessToken}` },
        });
        if (pmtRes.ok) {
          paymentData = await pmtRes.json() as {
            status?: string;
            external_reference?: string;
            transaction_amount?: number;
          };
        }
      }
    }

    // Load appointment + professional
    const [apt] = await db.select().from(appointmentsTable)
      .where(eq(appointmentsTable.id, appointmentId))
      .limit(1);
    if (!apt) {
      console.warn("[MP booking webhook] appointment not found:", appointmentId);
      return;
    }

    const [prof] = await db.select().from(professionalsTable)
      .where(eq(professionalsTable.id, apt.professionalId))
      .limit(1);
    if (!prof) return;

    // If we didn't get payment data yet, try with professional's own token
    if (!paymentData && prof.mpAccessToken) {
      const pmtRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${prof.mpAccessToken}` },
      });
      if (pmtRes.ok) {
        paymentData = await pmtRes.json() as {
          status?: string;
          external_reference?: string;
          transaction_amount?: number;
        };
      }
    }

    if (!paymentData) {
      console.warn("[MP booking webhook] could not fetch payment:", paymentId);
      return;
    }

    const paidAmount = paymentData.transaction_amount ?? 0;

    if (paymentData.status === "approved") {
      // ── Payment approved: confirm appointment and record payment ──
      await db.update(appointmentsTable)
        .set({
          status: "confirmed",
          paymentStatus: "paid",
          paymentId: String(paymentId),
          paymentAmount: String(paidAmount),
          paymentDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(appointmentsTable.id, appointmentId));

      // Send payment confirmation emails
      const emailData = {
        clientName: apt.clientName,
        clientEmail: apt.clientEmail,
        profName: prof.name,
        profEmail: prof.email,
        profPhone: prof.phone,
        serviceName: apt.serviceName,
        date: apt.date,
        startTime: apt.startTime,
        price: paidAmount,
        paidAmount,
      };

      const { subject: cs, html: ch } = emailPaymentReceivedClient(emailData);
      const { subject: ps, html: ph } = emailPaymentReceivedProf(emailData);
      sendEmail(apt.clientEmail, cs, ch);
      sendEmail(prof.email, ps, ph);

    } else if (paymentData.status === "rejected" || paymentData.status === "cancelled") {
      // Payment failed — keep appointment as pending (professional can decide)
      await db.update(appointmentsTable)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(appointmentsTable.id, appointmentId));
    }

  } catch (err) {
    console.error("[MP booking webhook] error:", err);
  }
});

export default router;
