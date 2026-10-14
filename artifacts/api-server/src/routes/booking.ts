import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
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
import { getPublicAppUrl } from "../lib/app-url";
import { checkAppointmentLimit, refreshSubscriptionAccess } from "../lib/plans";
import { professionalMpFetch } from "../lib/mercado-pago-professional";

const router = Router();
const MP_API = "https://api.mercadopago.com";

function makeBookingStatusToken(slug: string, appointmentId: number): string {
  const secret = process.env.SESSION_SECRET ?? "turnohub-dev-secret";
  return createHmac("sha256", secret).update(`${slug}:${appointmentId}`).digest("hex");
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
function calcPaymentAmount(price: number, paymentMode: string, depositPercent: number, depositAmount: number | null): number {
  if (paymentMode === "full") return Math.round(price * 100) / 100;
  if (paymentMode === "deposit") {
    const amount = depositAmount !== null ? depositAmount : price * depositPercent / 100;
    return Math.round(amount * 100) / 100;
  }
  return 0;
}

/** Create a one-time MP payment preference using professional's own token */
async function createMpPreference(opts: {
  professionalId: number;
  profToken: string;
  profRefreshToken: string | null;
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
    const res = await professionalMpFetch({
      id: opts.professionalId,
      mpAccessToken: opts.profToken,
      mpRefreshToken: opts.profRefreshToken,
    }, `${MP_API}/checkout/preferences`, {
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
    .where(eq(professionalsTable.slug, String(slug)))
    .limit(1);

  if (!prof || !["active", "trial"].includes(prof.status) || !await refreshSubscriptionAccess(prof.id)) {
    res.status(404).json({ error: "Professional not found" });
    return;
  }

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
    depositAmount: prof.depositAmount === null ? null : Number(prof.depositAmount),
    services: services.map(s => ({ ...s, price: Number(s.price) })),
  });
});

// ── GET /:slug/payment-status/:appointmentId — signed checkout return state ──
router.get("/:slug/payment-status/:appointmentId", async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) {
    res.status(400).json({ error: "ID de reserva inválido." });
    return;
  }
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const expectedToken = makeBookingStatusToken(String(req.params.slug), appointmentId);
  const supplied = Buffer.from(token, "hex");
  const expected = Buffer.from(expectedToken, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.status(403).json({ error: "Token de consulta inválido." });
    return;
  }

  const [professional] = await db.select({ id: professionalsTable.id })
    .from(professionalsTable)
    .where(and(
      eq(professionalsTable.slug, String(req.params.slug)),
      eq(professionalsTable.status, "active"),
    ))
    .limit(1);
  if (!professional) {
    res.status(404).json({ error: "Reserva no encontrada." });
    return;
  }

  const [appointment] = await db.select({
    status: appointmentsTable.status,
    paymentStatus: appointmentsTable.paymentStatus,
    paymentAmount: appointmentsTable.paymentAmount,
  })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.id, appointmentId),
      eq(appointmentsTable.professionalId, professional.id),
    ))
    .limit(1);
  if (!appointment) {
    res.status(404).json({ error: "Reserva no encontrada." });
    return;
  }

  res.json({
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    paymentAmount: appointment.paymentStatus === "paid" && appointment.paymentAmount !== null
      ? Number(appointment.paymentAmount)
      : null,
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
    .where(eq(professionalsTable.slug, String(slug)))
    .limit(1);

  if (!prof || !["active", "trial"].includes(prof.status) || !await refreshSubscriptionAccess(prof.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

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
    .where(eq(professionalsTable.slug, String(slug)))
    .limit(1);

  if (!prof || !["active", "trial"].includes(prof.status) || !await refreshSubscriptionAccess(prof.id)) {
    res.status(404).json({ error: "Profesional no encontrado" });
    return;
  }

  const appointmentLimit = await checkAppointmentLimit(prof.id);
  if (!appointmentLimit.ok) {
    res.status(403).json({ error: appointmentLimit.message, code: "PLAN_LIMIT_REACHED" });
    return;
  }

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
  const baseUrl = getPublicAppUrl();

  if (requiresOnlinePayment && !baseUrl) {
    res.status(503).json({ error: "Los pagos online no están disponibles porque falta configurar la URL pública HTTPS." });
    return;
  }

  const paymentAmount = requiresOnlinePayment
    ? calcPaymentAmount(
        servicePrice,
        prof.paymentMode,
        prof.depositPercent,
        prof.depositAmount === null ? null : Number(prof.depositAmount),
      )
    : null;

  if (requiresOnlinePayment && (!paymentAmount || paymentAmount <= 0 || paymentAmount > servicePrice)) {
    res.status(400).json({ error: "El importe de la seña debe ser mayor que cero y no superar el precio del servicio." });
    return;
  }

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
    paymentAmount: paymentAmount === null ? null : String(paymentAmount),
  }).returning();

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
    paymentAmount: paymentAmount ?? undefined,
  };

  let paymentUrl: string | null = null;

  if (requiresOnlinePayment) {
    // ── Create MP payment preference ──
    const statusToken = makeBookingStatusToken(slug, appointment.id);
    const successUrl = `${baseUrl}/booking/${encodeURIComponent(slug)}?paid=1&apt=${appointment.id}&token=${statusToken}`;
    const failureUrl = `${baseUrl}/booking/${encodeURIComponent(slug)}?error=pago&apt=${appointment.id}&token=${statusToken}`;
    const notifUrl = `${baseUrl}/api/booking/mp/webhook`;

    const preference = await createMpPreference({
      professionalId: prof.id,
      profToken: prof.mpAccessToken!,
      profRefreshToken: prof.mpRefreshToken,
      title: `${service.name} — ${prof.name}`,
      amount: paymentAmount!,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      externalRef: `apt_${appointment.id}`,
      successUrl,
      failureUrl,
      notificationUrl: notifUrl,
    });

    if (!preference) {
      await db.update(appointmentsTable)
        .set({ status: "cancelled", paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(appointmentsTable.id, appointment.id));
      res.status(502).json({ error: "Mercado Pago no pudo crear el checkout. No se confirmó la reserva; intentá nuevamente." });
      return;
    }

    paymentUrl = preference.initPoint;
    await db.update(appointmentsTable)
      .set({ paymentId: preference.id, updatedAt: new Date() })
      .where(eq(appointmentsTable.id, appointment.id));
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
  try {
    const body = req.body as {
      type?: string;
      user_id?: number | string;
      data?: { id?: string };
    };
    if (body.type !== "payment" || !body.data?.id) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }
    if (!body.user_id) {
      res.status(503).json({ error: "Falta el vendedor en la notificación de Mercado Pago." });
      return;
    }

    const paymentId = body.data.id;
    const [seller] = await db.select().from(professionalsTable)
      .where(eq(professionalsTable.mpUserId, String(body.user_id)))
      .limit(1);
    if (!seller?.mpAccessToken) {
      res.status(503).json({ error: "No se encontró la cuenta Mercado Pago del profesional." });
      return;
    }

    // Never use TurnoHub's platform access token for a booking payment.
    const paymentResponse = await professionalMpFetch(seller, `${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${seller.mpAccessToken}` },
    });
    if (!paymentResponse.ok) {
      res.status(502).json({ error: "No se pudo verificar el pago con la cuenta del profesional." });
      return;
    }
    const payment = await paymentResponse.json() as {
      status?: string;
      external_reference?: string;
      transaction_amount?: number;
      date_approved?: string;
    };
    const match = (payment.external_reference || "").match(/^apt_(\d+)$/);
    if (!match) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const appointmentId = Number(match[1]);
    const [appointment] = await db.select().from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.id, appointmentId),
        eq(appointmentsTable.professionalId, seller.id),
      ))
      .limit(1);
    if (!appointment) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }
    if (appointment.paymentStatus === "paid" && appointment.paymentId === String(paymentId)) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }

    const paidAmount = Number(payment.transaction_amount);
    if (payment.status === "approved") {
      const expectedAmount = Number(appointment.paymentAmount);
      if (!Number.isFinite(paidAmount) || paidAmount <= 0 ||
          !Number.isFinite(expectedAmount) || Math.abs(paidAmount - expectedAmount) > 0.01) {
        console.error("[MP booking webhook] amount mismatch", { appointmentId, paymentId, expectedAmount, paidAmount });
        res.status(422).json({ error: "El importe verificado no coincide con el importe de la reserva." });
        return;
      }

      await db.update(appointmentsTable)
        .set({
          status: "confirmed",
          paymentStatus: "paid",
          paymentId: String(paymentId),
          paymentAmount: String(paidAmount),
          paymentDate: payment.date_approved ? new Date(payment.date_approved) : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(appointmentsTable.id, appointmentId));

      const emailData = {
        clientName: appointment.clientName,
        clientEmail: appointment.clientEmail,
        profName: seller.name,
        profEmail: seller.email,
        profPhone: seller.phone,
        serviceName: appointment.serviceName,
        date: appointment.date,
        startTime: appointment.startTime,
        price: paidAmount,
        paymentMode: appointment.paymentMode ?? undefined,
        paymentAmount: paidAmount,
        paidAmount,
      };
      const { subject: clientSubject, html: clientHtml } = emailPaymentReceivedClient(emailData);
      const { subject: professionalSubject, html: professionalHtml } = emailPaymentReceivedProf(emailData);
      await Promise.all([
        sendEmail(appointment.clientEmail, clientSubject, clientHtml),
        sendEmail(seller.email, professionalSubject, professionalHtml),
      ]);
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await db.update(appointmentsTable)
        .set({ status: "cancelled", paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(appointmentsTable.id, appointmentId));
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[MP booking webhook] error:", err);
    res.status(500).json({ error: "No se pudo procesar el pago." });
  }
});

export default router;
