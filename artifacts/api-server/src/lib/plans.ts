/** Plan limits enforcement for TurnoHub */

import { db } from "@workspace/db";
import { servicesTable, appointmentsTable, subscriptionsTable, professionalsTable } from "@workspace/db";
import { eq, and, gte, lte, count } from "drizzle-orm";

export interface PlanLimits {
  maxServices: number | null;
  maxAppointmentsPerMonth: number | null;
  name: string;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  trial: { name: "Período de prueba", maxServices: 3, maxAppointmentsPerMonth: 20 },
  basico: { name: "Básico", maxServices: 3, maxAppointmentsPerMonth: 50 },
  profesional: { name: "Profesional", maxServices: 10, maxAppointmentsPerMonth: 200 },
  premium: { name: "Premium", maxServices: null, maxAppointmentsPerMonth: null },
};

export function getPlanLimits(planSlug: string | null): PlanLimits {
  return PLAN_LIMITS[planSlug ?? "trial"] ?? PLAN_LIMITS["trial"];
}

export async function refreshSubscriptionAccess(professionalId: number): Promise<boolean> {
  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, professionalId))
    .limit(1);
  if (!sub) return false;

  const now = new Date();
  if ((sub.status === "trial" || sub.status === "active") && sub.currentPeriodEnd <= now) {
    await db.update(subscriptionsTable)
      .set({ status: sub.cancelAtPeriodEnd ? "cancelled" : "past_due", updatedAt: now })
      .where(eq(subscriptionsTable.id, sub.id));
    await db.update(professionalsTable)
      .set({ status: "suspended", updatedAt: now })
      .where(eq(professionalsTable.id, professionalId));
    return false;
  }

  return sub.status === "trial" || sub.status === "active";
}

export async function getActivePlanSlug(professionalId: number): Promise<string> {
  const [sub] = await db
    .select({ planSlug: subscriptionsTable.planSlug, status: subscriptionsTable.status })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.professionalId, professionalId))
    .limit(1);

  if (!sub) return "trial";
  if (sub.status === "active") return sub.planSlug;
  if (sub.status === "trial") return "trial";
  return "trial"; // past_due / cancelled / suspended → trial limits
}

export async function checkServiceLimit(professionalId: number): Promise<{ ok: boolean; message?: string }> {
  const planSlug = await getActivePlanSlug(professionalId);
  const limits = getPlanLimits(planSlug);
  if (limits.maxServices === null) return { ok: true };

  const [result] = await db
    .select({ count: count() })
    .from(servicesTable)
    .where(and(eq(servicesTable.professionalId, professionalId), eq(servicesTable.isActive, true)));

  const current = Number(result?.count ?? 0);
  if (current >= limits.maxServices) {
    return {
      ok: false,
      message: `Tu plan ${limits.name} permite hasta ${limits.maxServices} servicio${limits.maxServices !== 1 ? "s" : ""}. Actualizá tu plan para agregar más.`,
    };
  }
  return { ok: true };
}

export async function checkAppointmentLimit(professionalId: number): Promise<{ ok: boolean; message?: string }> {
  const planSlug = await getActivePlanSlug(professionalId);
  const limits = getPlanLimits(planSlug);
  if (limits.maxAppointmentsPerMonth === null) return { ok: true };

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [result] = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.professionalId, professionalId),
        gte(appointmentsTable.date, firstDay),
        lte(appointmentsTable.date, lastDay),
      )
    );

  const current = Number(result?.count ?? 0);
  if (current >= limits.maxAppointmentsPerMonth) {
    return {
      ok: false,
      message: `Tu plan ${limits.name} permite hasta ${limits.maxAppointmentsPerMonth} turnos por mes. Actualizá tu plan o esperá al mes siguiente.`,
    };
  }
  return { ok: true };
}
