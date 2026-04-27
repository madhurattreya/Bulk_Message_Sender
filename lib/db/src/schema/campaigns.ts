import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  templateId: integer("template_id").notNull(),
  status: text("status").notNull().default("queued"),
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  rateLimitMs: integer("rate_limit_ms").notNull().default(1500),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campaignMessagesTable = pgTable("campaign_messages", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  contactId: integer("contact_id").notNull(),
  recipientName: text("recipient_name"),
  recipientAddress: text("recipient_address"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export type Campaign = typeof campaignsTable.$inferSelect;
export type CampaignMessage = typeof campaignMessagesTable.$inferSelect;
