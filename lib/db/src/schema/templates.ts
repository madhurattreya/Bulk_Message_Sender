import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Template = typeof templatesTable.$inferSelect;
export type InsertTemplate = typeof templatesTable.$inferInsert;
