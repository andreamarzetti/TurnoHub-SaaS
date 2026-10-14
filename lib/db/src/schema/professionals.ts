import { pgTable, serial, text, timestamp, integer, boolean, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const professionalStatusEnum = pgEnum("professional_status", ["active", "suspended", "trial"]);

export const professionalsTable = pgTable("professionals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  profession: text("profession").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  avatarUrl: text("avatar_url"),
  whatsappNumber: text("whatsapp_number"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  websiteUrl: text("website_url"),
  status: professionalStatusEnum("status").notNull().default("trial"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  currentPlan: text("current_plan"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  // Payment configuration
  paymentMode: text("payment_mode").notNull().default("none"),  // none | full | deposit | in_person
  depositPercent: integer("deposit_percent").notNull().default(30),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }),
  // MP Connect (professional's own account)
  mpAccessToken: text("mp_access_token"),
  mpRefreshToken: text("mp_refresh_token"),
  mpUserId: text("mp_user_id"),
  mpPublicKey: text("mp_public_key"),
  // Google Calendar
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleCalendarId: text("google_calendar_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfessionalSchema = createInsertSchema(professionalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Professional = typeof professionalsTable.$inferSelect;
