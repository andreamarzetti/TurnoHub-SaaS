/** Centralized email module for TurnoHub */

const FROM_EMAIL = process.env.EMAIL_FROM || "TurnoHub <noreply@turnohub.app>";
const RESEND_URL = "https://api.resend.com/emails";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // fail silently — email is non-critical
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[email] send failed:", res.status, body);
    }
  } catch (err) {
    console.warn("[email] send error:", err);
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>TurnoHub</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#14B8A6,#0d9488);padding:24px 32px;">
            <span style="color:white;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Turno<span style="opacity:0.8">Hub</span></span>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          ${content}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">TurnoHub · Sistema de turnos online para profesionales</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoBlock(rows: { label: string; value: string }[]): string {
  return `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;">
    ${rows.map(r => `<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
      <span style="color:#6b7280;">${r.label}</span>
      <span style="color:#111827;font-weight:600;">${r.value}</span>
    </div>`).join("")}
  </div>`;
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;background:${color}20;color:${color};padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;">${text}</span>`;
}

// ─── Appointment data type ──────────────────────────────────────────────────────

export interface AptEmailData {
  clientName: string;
  clientEmail: string;
  profName: string;
  profEmail: string;
  profPhone?: string | null;
  serviceName: string;
  date: string;       // "2025-03-15"
  startTime: string;  // "09:30:00"
  price: number;
  paymentMode?: string;
  paymentAmount?: number;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function fmtTime(t: string): string { return t.substring(0, 5); }

// ─── Client: Booking Created ────────────────────────────────────────────────────

export function emailBookingCreatedClient(data: AptEmailData): { subject: string; html: string } {
  const subject = `✅ Turno confirmado con ${data.profName} — ${fmtDate(data.date)}`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">¡Tu turno está confirmado!</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">Hola <strong>${data.clientName}</strong>, tu reserva fue registrada correctamente.</p>
    ${infoBlock([
      { label: "Profesional", value: data.profName },
      { label: "Servicio", value: data.serviceName },
      { label: "Fecha", value: fmtDate(data.date) },
      { label: "Hora", value: fmtTime(data.startTime) + " hs" },
      { label: "Precio", value: `$${data.price.toLocaleString("es-AR")} ARS` },
    ])}
    ${data.paymentMode === "none" || !data.paymentMode
      ? `<p style="color:#4b5563;font-size:14px;">El pago se realiza directamente en el consultorio/local.</p>`
      : data.paymentMode === "in_person"
      ? `<p style="color:#4b5563;font-size:14px;">El pago se abona de forma presencial al momento del turno.</p>`
      : data.paymentAmount
      ? `<p style="color:#4b5563;font-size:14px;">✅ Seña recibida: <strong>$${data.paymentAmount.toLocaleString("es-AR")}</strong></p>`
      : ""}
    ${data.profPhone ? `<p style="color:#4b5563;font-size:14px;margin-top:16px;">📞 Contacto: <strong>${data.profPhone}</strong></p>` : ""}
    <p style="color:#6b7280;font-size:13px;margin-top:20px;">Si necesitás cancelar o modificar el turno, contactá directamente al profesional.</p>
  `);
  return { subject, html };
}

// ─── Professional: Booking Created ─────────────────────────────────────────────

export function emailBookingCreatedProf(data: AptEmailData): { subject: string; html: string } {
  const subject = `📅 Nuevo turno: ${data.clientName} — ${fmtDate(data.date)}`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Nuevo turno reservado</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">Tienes una nueva reserva a través de TurnoHub.</p>
    ${infoBlock([
      { label: "Cliente", value: data.clientName },
      { label: "Email cliente", value: data.clientEmail },
      { label: "Servicio", value: data.serviceName },
      { label: "Fecha", value: fmtDate(data.date) },
      { label: "Hora", value: fmtTime(data.startTime) + " hs" },
      { label: "Precio", value: `$${data.price.toLocaleString("es-AR")} ARS` },
    ])}
    <p style="color:#6b7280;font-size:13px;margin-top:16px;">Accedé al panel para confirmar, reprogramar o gestionar este turno.</p>
  `);
  return { subject, html };
}

// ─── Client: Appointment Confirmed ─────────────────────────────────────────────

export function emailBookingConfirmedClient(data: AptEmailData): { subject: string; html: string } {
  const subject = `✅ Turno confirmado — ${fmtDate(data.date)} ${fmtTime(data.startTime)} hs`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Tu turno fue confirmado</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">Hola <strong>${data.clientName}</strong>, <strong>${data.profName}</strong> confirmó tu turno.</p>
    ${infoBlock([
      { label: "Profesional", value: data.profName },
      { label: "Servicio", value: data.serviceName },
      { label: "Fecha", value: fmtDate(data.date) },
      { label: "Hora", value: fmtTime(data.startTime) + " hs" },
    ])}
    <p style="color:#6b7280;font-size:13px;">¡Te esperamos! Si necesitás cambiar el turno, contactá al profesional.</p>
  `);
  return { subject, html };
}

// ─── Professional: Appointment Confirmed ───────────────────────────────────────

export function emailBookingConfirmedProf(data: AptEmailData): { subject: string; html: string } {
  const subject = `✅ Confirmaste el turno de ${data.clientName}`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Turno confirmado</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">Confirmaste el turno de <strong>${data.clientName}</strong>. El cliente fue notificado.</p>
    ${infoBlock([
      { label: "Cliente", value: data.clientName },
      { label: "Servicio", value: data.serviceName },
      { label: "Fecha", value: fmtDate(data.date) },
      { label: "Hora", value: fmtTime(data.startTime) + " hs" },
    ])}
  `);
  return { subject, html };
}

// ─── Client: Appointment Cancelled ─────────────────────────────────────────────

export function emailBookingCancelledClient(data: AptEmailData): { subject: string; html: string } {
  const subject = `❌ Tu turno fue cancelado — ${fmtDate(data.date)}`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Turno cancelado</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">Hola <strong>${data.clientName}</strong>, tu turno con <strong>${data.profName}</strong> fue cancelado.</p>
    ${infoBlock([
      { label: "Servicio", value: data.serviceName },
      { label: "Fecha", value: fmtDate(data.date) },
      { label: "Hora", value: fmtTime(data.startTime) + " hs" },
    ])}
    <p style="color:#4b5563;font-size:14px;margin-top:16px;">Podés reservar un nuevo turno cuando quieras.</p>
    ${data.profPhone ? `<p style="color:#4b5563;font-size:14px;">📞 Contacto: <strong>${data.profPhone}</strong></p>` : ""}
  `);
  return { subject, html };
}

// ─── Professional: Appointment Cancelled ───────────────────────────────────────

export function emailBookingCancelledProf(data: AptEmailData): { subject: string; html: string } {
  const subject = `❌ Turno cancelado — ${data.clientName} — ${fmtDate(data.date)}`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Turno cancelado</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">El turno de <strong>${data.clientName}</strong> fue cancelado.</p>
    ${infoBlock([
      { label: "Cliente", value: data.clientName },
      { label: "Servicio", value: data.serviceName },
      { label: "Fecha", value: fmtDate(data.date) },
      { label: "Hora", value: fmtTime(data.startTime) + " hs" },
    ])}
    <p style="color:#6b7280;font-size:13px;">El horario queda disponible para nuevas reservas.</p>
  `);
  return { subject, html };
}

// ─── Client: Payment Received ───────────────────────────────────────────────────

export function emailPaymentReceivedClient(data: AptEmailData & { paidAmount: number }): { subject: string; html: string } {
  const subject = `💳 Pago recibido — $${data.paidAmount.toLocaleString("es-AR")} ARS`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Pago confirmado</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">Hola <strong>${data.clientName}</strong>, recibimos tu pago correctamente.</p>
    ${infoBlock([
      { label: "Monto pagado", value: `$${data.paidAmount.toLocaleString("es-AR")} ARS` },
      { label: "Servicio", value: data.serviceName },
      { label: "Fecha del turno", value: fmtDate(data.date) },
      { label: "Hora", value: fmtTime(data.startTime) + " hs" },
      { label: "Profesional", value: data.profName },
    ])}
    <p style="color:#6b7280;font-size:13px;margin-top:16px;">Guardá este email como comprobante de pago.</p>
  `);
  return { subject, html };
}

// ─── Professional: Payment Received ────────────────────────────────────────────

export function emailPaymentReceivedProf(data: AptEmailData & { paidAmount: number }): { subject: string; html: string } {
  const subject = `💳 Pago recibido de ${data.clientName} — $${data.paidAmount.toLocaleString("es-AR")}`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Pago recibido</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;"><strong>${data.clientName}</strong> realizó el pago de su turno.</p>
    ${infoBlock([
      { label: "Cliente", value: data.clientName },
      { label: "Monto", value: `$${data.paidAmount.toLocaleString("es-AR")} ARS` },
      { label: "Servicio", value: data.serviceName },
      { label: "Fecha", value: fmtDate(data.date) },
      { label: "Hora", value: fmtTime(data.startTime) + " hs" },
    ])}
  `);
  return { subject, html };
}

// ─── Client: Appointment Rescheduled ───────────────────────────────────────────

export function emailBookingRescheduledClient(data: AptEmailData & { oldDate: string; oldTime: string }): { subject: string; html: string } {
  const subject = `📅 Tu turno fue reprogramado — ${fmtDate(data.date)}`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Turno reprogramado</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">Hola <strong>${data.clientName}</strong>, tu turno con <strong>${data.profName}</strong> fue reprogramado.</p>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:#92400e;">
      <strong>Antes:</strong> ${fmtDate(data.oldDate)} a las ${fmtTime(data.oldTime)} hs
    </div>
    ${infoBlock([
      { label: "Nueva fecha", value: fmtDate(data.date) },
      { label: "Nueva hora", value: fmtTime(data.startTime) + " hs" },
      { label: "Servicio", value: data.serviceName },
      { label: "Profesional", value: data.profName },
    ])}
  `);
  return { subject, html };
}

// ─── Professional: Subscription Activated ──────────────────────────────────────

export function emailSubscriptionActivated(profName: string, profEmail: string, planName: string): { subject: string; html: string } {
  const subject = `🎉 Tu suscripción ${planName} está activa — TurnoHub`;
  const html = baseLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">¡Suscripción activada!</h2>
    <p style="color:#4b5563;font-size:15px;margin:0 0 20px;">Hola <strong>${profName}</strong>, tu suscripción al plan <strong>${planName}</strong> está activa. ¡Ya podés usar todas las funcionalidades!</p>
    <div style="background:#d1fae5;border:1px solid #34d399;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">
      <span style="color:#065f46;font-size:18px;font-weight:700;">Plan ${planName} activado ✓</span>
    </div>
    <p style="color:#6b7280;font-size:13px;margin-top:16px;">Accedé a tu panel en <a href="https://turnohub.app" style="color:#14B8A6;">TurnoHub</a> para gestionar tus turnos.</p>
  `);
  return { subject, html };
}
