import { Router } from "express";
import { db } from "@workspace/db";
import { availabilitySlotsTable, professionalsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateAvailabilitySlotBody, UpdateAvailabilitySlotBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { requireSubscriptionAccess } from "../middlewares/subscription-access";

const router = Router();
router.use(requireSubscriptionAccess);

async function getProfessionalForUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [prof] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  return prof || null;
}

router.get("/", requireAuth, async (req, res) => {
  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const slots = await db.select().from(availabilitySlotsTable)
    .where(eq(availabilitySlotsTable.professionalId, prof.id))
    .orderBy(availabilitySlotsTable.dayOfWeek);

  res.json(slots);
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateAvailabilitySlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [slot] = await db.insert(availabilitySlotsTable).values({
    ...parsed.data,
    professionalId: prof.id,
  }).returning();

  res.status(201).json(slot);
});

router.patch("/:slotId", requireAuth, async (req, res) => {
  const slotId = parseInt(String(req.params.slotId));
  if (isNaN(slotId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateAvailabilitySlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(availabilitySlotsTable)
    .set(parsed.data)
    .where(and(eq(availabilitySlotsTable.id, slotId), eq(availabilitySlotsTable.professionalId, prof.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Slot not found" }); return; }
  res.json(updated);
});

router.delete("/:slotId", requireAuth, async (req, res) => {
  const slotId = parseInt(String(req.params.slotId));
  if (isNaN(slotId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const prof = await getProfessionalForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(availabilitySlotsTable)
    .where(and(eq(availabilitySlotsTable.id, slotId), eq(availabilitySlotsTable.professionalId, prof.id)));

  res.status(204).send();
});

export default router;
