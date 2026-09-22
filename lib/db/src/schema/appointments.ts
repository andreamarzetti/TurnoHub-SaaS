import { pgTable, serial, text, timestamp, integer, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { professionalsTable } from "./professionals";
import { servicesTable } from "./services";
import { clientsTable } from "./clients";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending", "confirmed", "cancelled", "completed", "rescheduled"
]);

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").notNull().references(() => professionalsTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  serviceName: text("service_name").notNull(),
  clientId: integer("client_id").references(() => clientsTable.id),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  // Payment tracking
  paymentStatus: text("payment_status"),  // pending | paid | waived
  paymentId: text("payment_id"),          // MP payment/preference ID
  paymentAmount: numeric("payment_amount", { precision: 10, scale: 2 }),
  paymentDate: timestamp("payment_date", { withTimezone: true }),
  paymentMode: text("payment_mode"),      // none | full | deposit | in_person
  // Google Calendar
  googleEventId: text("google_event_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
