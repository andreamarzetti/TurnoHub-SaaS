import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable, professionalsTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function makeUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let count = 0;
  while (true) {
    const existing = await db.select().from(professionalsTable).where(eq(professionalsTable.slug, slug)).limit(1);
    if (existing.length === 0) return slug;
    count++;
    slug = `${base}-${count}`;
  }
}

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { name, email, password, profession } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash,
    role: "professional",
  }).returning();

  const slugBase = generateSlug(name);
  const slug = await makeUniqueSlug(slugBase);

  const [professional] = await db.insert(professionalsTable).values({
    userId: user.id,
    name,
    email,
    profession,
    slug,
    status: "trial",
    trialEndsAt,
  }).returning();

  await db.insert(subscriptionsTable).values({
    professionalId: professional.id,
    planSlug: "trial",
    status: "trial",
    currentPeriodStart: new Date(),
    currentPeriodEnd: trialEndsAt,
  });

  req.session.userId = user.id;
  req.session.role = user.role;

  const { passwordHash: _, ...userOut } = user;
  res.status(201).json({ user: userOut });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  const { passwordHash: _, ...userOut } = user;
  res.status(200).json({ user: userOut });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { passwordHash: _, ...userOut } = user;
  res.json(userOut);
});

export default router;
