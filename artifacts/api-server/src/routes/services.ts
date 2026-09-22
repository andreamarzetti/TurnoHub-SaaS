import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, professionalsTable, usersTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { CreateServiceBody, UpdateServiceBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { getActivePlanSlug, getPlanLimits } from "../lib/plans";

const router = Router();

async function getProfessionalForUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [prof] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  return prof || null;
}

router.get("/", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Professional not found" }); return; }

  const services = await db.select().from(servicesTable)
    .where(eq(servicesTable.professionalId, prof.id))
    .orderBy(servicesTable.createdAt);

  res.json(services.map(s => ({ ...s, price: Number(s.price) })));
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Professional not found" }); return; }

  // ── Plan limit check ──
  const planSlug = await getActivePlanSlug(prof.id);
  const limits = getPlanLimits(planSlug);

  if (limits.maxServices !== null) {
    const [result] = await db
      .select({ count: count() })
      .from(servicesTable)
      .where(and(eq(servicesTable.professionalId, prof.id), eq(servicesTable.isActive, true)));

    const current = Number(result?.count ?? 0);
    if (current >= limits.maxServices) {
      res.status(403).json({
        error: `Tu plan ${limits.name} permite hasta ${limits.maxServices} servicio${limits.maxServices !== 1 ? "s" : ""}. Actualizá tu plan para agregar más.`,
        code: "PLAN_LIMIT_REACHED",
      });
      return;
    }
  }

  const [service] = await db.insert(servicesTable).values({
    ...parsed.data,
    professionalId: prof.id,
    price: String(parsed.data.price),
  }).returning();

  res.status(201).json({ ...service, price: Number(service.price) });
});

router.patch("/:serviceId", requireAuth, async (req, res) => {
  const serviceId = parseInt(String(req.params.serviceId));
  if (isNaN(serviceId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Professional not found" }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);

  const [updated] = await db.update(servicesTable)
    .set(updateData)
    .where(and(eq(servicesTable.id, serviceId), eq(servicesTable.professionalId, prof.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Service not found" }); return; }
  res.json({ ...updated, price: Number(updated.price) });
});

router.delete("/:serviceId", requireAuth, async (req, res) => {
  const serviceId = parseInt(String(req.params.serviceId));
  if (isNaN(serviceId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Professional not found" }); return; }

  await db.delete(servicesTable)
    .where(and(eq(servicesTable.id, serviceId), eq(servicesTable.professionalId, prof.id)));

  res.status(204).send();
});

export default router;
