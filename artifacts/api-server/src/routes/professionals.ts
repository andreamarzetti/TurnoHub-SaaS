import { Router } from "express";
import { db } from "@workspace/db";
import { professionalsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateMyProfessionalProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";
import { getPublicAppUrl } from "../lib/app-url";

const router = Router();

const MP_API = "https://api.mercadopago.com";

async function getProfForUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [prof] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  return prof || null;
}

// ── GET /me ───────────────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [professional] = await db.select().from(professionalsTable).where(eq(professionalsTable.userId, user.id)).limit(1);
  if (!professional) { res.status(404).json({ error: "Professional profile not found" }); return; }

  // Strip sensitive OAuth tokens from response
  const { mpAccessToken, mpRefreshToken, googleAccessToken, googleRefreshToken, ...safe } = professional;
  res.json({
    ...safe,
    depositAmount: professional.depositAmount === null ? null : Number(professional.depositAmount),
    mpUserId: professional.mpUserId ?? null,
  });
});

// ── PATCH /me ─────────────────────────────────────────────────────────────────
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

  // Validate paymentMode if provided
  const allowedModes = ["none", "full", "deposit", "in_person"];
  if (parsed.data.paymentMode && !allowedModes.includes(parsed.data.paymentMode)) {
    res.status(400).json({ error: "paymentMode inválido" });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.depositPercent !== undefined) {
    const pct = Number(parsed.data.depositPercent);
    if (pct < 1 || pct > 100) { res.status(400).json({ error: "depositPercent debe estar entre 1 y 100" }); return; }
    updateData.depositPercent = pct;
  }
  if (parsed.data.depositAmount !== undefined) {
    const amount = parsed.data.depositAmount === null ? null : Number(parsed.data.depositAmount);
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      res.status(400).json({ error: "depositAmount debe ser mayor que cero." });
      return;
    }
    updateData.depositAmount = amount === null ? null : String(amount);
  }

  const [updated] = await db.update(professionalsTable)
    .set(updateData)
    .where(eq(professionalsTable.id, professional.id))
    .returning();

  const { mpAccessToken, mpRefreshToken, googleAccessToken, googleRefreshToken, ...safe } = updated;
  res.json({
    ...safe,
    depositAmount: updated.depositAmount === null ? null : Number(updated.depositAmount),
    mpUserId: updated.mpUserId ?? null,
  });
});

// ── MP Connect: GET /me/mp-connect/status ────────────────────────────────────
router.get("/me/mp-connect/status", requireAuth, async (req, res) => {
  const prof = await getProfForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    connected: !!prof.mpAccessToken,
    mpUserId: prof.mpUserId ?? null,
  });
});

// ── MP Connect: GET /me/mp-connect/url ───────────────────────────────────────
router.get("/me/mp-connect/url", requireAuth, async (req, res) => {
  const clientId = process.env.MP_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Mercado Pago Connect no está configurado. Contactá al administrador." });
    return;
  }

  const prof = await getProfForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  const baseUrl = getPublicAppUrl();
  if (!baseUrl) {
    res.status(503).json({ error: "La URL pública HTTPS de TurnoHub no está configurada." });
    return;
  }
  const redirectUri = `${baseUrl}/api/professionals/me/mp-connect/callback`;
  const state = crypto.randomBytes(32).toString("hex");

  // Store a single-use state value in the signed server-side session.
  const sessionData = req.session as unknown as Record<string, unknown>;
  sessionData.mpOAuthState = state;
  sessionData.mpOAuthProfId = prof.id;
  sessionData.mpOAuthCreatedAt = Date.now();

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: redirectUri,
    state,
  });

  const authUrl = `https://auth.mercadopago.com.ar/authorization?${params.toString()}`;
  res.json({ authUrl });
});

// ── MP Connect: GET /me/mp-connect/callback ──────────────────────────────────
// This is a redirect handler — browser lands here after MP OAuth
router.get("/me/mp-connect/callback", requireAuth, async (req, res) => {
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
  const baseUrl = getPublicAppUrl();
  if (!baseUrl) {
    res.status(503).send("La URL pública de TurnoHub no está configurada.");
    return;
  }
  const frontendBase = baseUrl;
  const sessionData = req.session as unknown as Record<string, unknown>;
  const expectedState = sessionData.mpOAuthState;
  const expectedProfId = sessionData.mpOAuthProfId;
  const createdAt = Number(sessionData.mpOAuthCreatedAt || 0);
  // Consume the state before making any outbound request: one attempt only.
  delete sessionData.mpOAuthState;
  delete sessionData.mpOAuthProfId;
  delete sessionData.mpOAuthCreatedAt;

  const prof = await getProfForUser(req.session.userId!);
  if (
    typeof state !== "string" ||
    typeof expectedState !== "string" ||
    state !== expectedState ||
    !prof ||
    Number(expectedProfId) !== prof.id ||
    !createdAt ||
    Date.now() - createdAt > 10 * 60 * 1000
  ) {
    res.redirect(`${frontendBase}/configuracion?mp_error=state`);
    return;
  }

  if (error) {
    console.error("[MP Connect] OAuth error:", error);
    res.redirect(`${frontendBase}/configuracion?mp_error=1`);
    return;
  }

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.redirect(`${frontendBase}/configuracion?mp_error=1`);
    return;
  }

  if (!code) {
    res.redirect(`${frontendBase}/configuracion?mp_error=1`);
    return;
  }

  const redirectUri = `${baseUrl}/api/professionals/me/mp-connect/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`${MP_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[MP Connect] token exchange failed:", tokenRes.status, err);
      res.redirect(`${frontendBase}/configuracion?mp_error=1`);
      return;
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      user_id?: number;
      public_key?: string;
    };

    // Store in DB
    await db.update(professionalsTable)
      .set({
        mpAccessToken: tokens.access_token,
        mpRefreshToken: tokens.refresh_token ?? null,
        mpUserId: tokens.user_id ? String(tokens.user_id) : null,
        mpPublicKey: tokens.public_key ?? null,
        updatedAt: new Date(),
      })
      .where(eq(professionalsTable.id, prof.id));

    res.redirect(`${frontendBase}/configuracion?mp_connected=1`);
  } catch (err) {
    console.error("[MP Connect] callback error:", err);
    res.redirect(`${frontendBase}/configuracion?mp_error=1`);
  }
});

// ── MP Connect: DELETE /me/mp-connect ────────────────────────────────────────
router.delete("/me/mp-connect", requireAuth, async (req, res) => {
  const prof = await getProfForUser(req.session.userId!);
  if (!prof) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(professionalsTable)
    .set({
      mpAccessToken: null,
      mpRefreshToken: null,
      mpUserId: null,
      mpPublicKey: null,
      // Reset payment mode to none if was requiring payment
      paymentMode: prof.paymentMode === "none" || prof.paymentMode === "in_person" ? prof.paymentMode : "none",
      updatedAt: new Date(),
    })
    .where(eq(professionalsTable.id, prof.id));

  res.json({ ok: true, message: "Cuenta de Mercado Pago desvinculada." });
});

// ── GET /:professionalId ──────────────────────────────────────────────────────
router.get("/:professionalId", async (req, res) => {
  const id = parseInt(req.params.professionalId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [professional] = await db.select().from(professionalsTable).where(eq(professionalsTable.id, id)).limit(1);
  if (!professional) { res.status(404).json({ error: "Not found" }); return; }

  const { mpAccessToken, mpRefreshToken, googleAccessToken, googleRefreshToken, ...safe } = professional;
  res.json(safe);
});

export default router;
