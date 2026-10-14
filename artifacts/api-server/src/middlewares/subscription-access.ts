import { type Request, type Response, type NextFunction } from "express";
import { db, professionalsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { refreshSubscriptionAccess } from "../lib/plans";

export async function requireSubscriptionAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [user] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [professional] = await db.select({ id: professionalsTable.id })
      .from(professionalsTable)
      .where(eq(professionalsTable.userId, user.id))
      .limit(1);
    if (!professional) {
      res.status(404).json({ error: "Professional profile not found" });
      return;
    }

    if (!await refreshSubscriptionAccess(professional.id)) {
      res.status(402).json({
        error: "La suscripción venció o está pendiente de pago. Reactivá tu plan para seguir usando TurnoHub.",
        code: "SUBSCRIPTION_REQUIRED",
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
