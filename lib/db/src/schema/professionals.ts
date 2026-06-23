import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
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
  currentPlan: text("current_plan"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfessionalSchema = createInsertSchema(professionalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Professional = typeof professionalsTable.$inferSelect;
