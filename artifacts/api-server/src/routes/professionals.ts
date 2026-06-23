import { Router } from "express";
import { db } from "@workspace/db";
import { professionalsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateMyProfessionalProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [professional] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  if (!professional) { res.status(404).json({ error: "Professional profile not found" }); return; }

  res.json(professional);
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = UpdateMyProfessionalProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [professional] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  if (!professional) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(professionalsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(professionalsTable.id, professional.id))
    .returning();

  res.json(updated);
});

router.get("/:professionalId", async (req, res) => {
  const id = parseInt(req.params.professionalId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [professional] = await db.select().from(professionalsTable).where(eq(professionalsTable.id, id)).limit(1);
  if (!professional) { res.status(404).json({ error: "Not found" }); return; }

  res.json(professional);
});

export default router;
