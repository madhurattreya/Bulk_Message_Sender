import { eq, inArray } from "drizzle-orm";
import {
  db,
  campaignsTable,
  campaignMessagesTable,
  contactsTable,
  templatesTable,
  type Contact,
  type Template,
} from "@workspace/db";
import { sendMail } from "./email";
import { whatsappManager } from "./whatsapp";
import { renderTemplate } from "./template";
import { logger } from "./logger";

export async function runCampaign(campaignId: number): Promise<void> {
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, campaignId));
  if (!campaign) {
    logger.warn({ campaignId }, "runCampaign: campaign not found");
    return;
  }

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, campaign.templateId));
  if (!template) {
    await db
      .update(campaignsTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(campaignsTable.id, campaignId));
    return;
  }

  const messages = await db
    .select()
    .from(campaignMessagesTable)
    .where(eq(campaignMessagesTable.campaignId, campaignId));

  const contactIds = messages.map((m) => m.contactId);
  const contacts = contactIds.length
    ? await db
        .select()
        .from(contactsTable)
        .where(inArray(contactsTable.id, contactIds))
    : [];
  const contactMap = new Map<number, Contact>(contacts.map((c) => [c.id, c]));

  await db
    .update(campaignsTable)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(campaignsTable.id, campaignId));

  let sent = 0;
  let failed = 0;
  const delay = Math.max(250, campaign.rateLimitMs);

  for (const msg of messages) {
    const contact = contactMap.get(msg.contactId);
    if (!contact) {
      failed += 1;
      await db
        .update(campaignMessagesTable)
        .set({
          status: "failed",
          attempts: msg.attempts + 1,
          error: "Contact not found",
        })
        .where(eq(campaignMessagesTable.id, msg.id));
      continue;
    }

    try {
      await sendOne(campaign.channel, template, contact);
      sent += 1;
      await db
        .update(campaignMessagesTable)
        .set({
          status: "sent",
          attempts: msg.attempts + 1,
          sentAt: new Date(),
          error: null,
        })
        .where(eq(campaignMessagesTable.id, msg.id));
    } catch (err) {
      failed += 1;
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn({ err, contactId: contact.id }, "Send failed");
      await db
        .update(campaignMessagesTable)
        .set({
          status: "failed",
          attempts: msg.attempts + 1,
          error: errMsg,
        })
        .where(eq(campaignMessagesTable.id, msg.id));
    }

    await db
      .update(campaignsTable)
      .set({ sentCount: sent, failedCount: failed })
      .where(eq(campaignsTable.id, campaignId));

    // Rate limit between sends to avoid spam restrictions
    await sleep(delay);
  }

  await db
    .update(campaignsTable)
    .set({
      status: "completed",
      sentCount: sent,
      failedCount: failed,
      completedAt: new Date(),
    })
    .where(eq(campaignsTable.id, campaignId));

  logger.info({ campaignId, sent, failed }, "Campaign completed");
}

async function sendOne(
  channel: string,
  template: Template,
  contact: Contact,
): Promise<void> {
  const body = renderTemplate(template.body, contact);

  if (channel === "email") {
    if (!contact.email) {
      throw new Error("Contact has no email address");
    }
    const subject = template.subject
      ? renderTemplate(template.subject, contact)
      : "(no subject)";
    await sendMail(contact.email, subject, body);
    return;
  }

  if (channel === "whatsapp") {
    if (!contact.phone) {
      throw new Error("Contact has no phone number");
    }
    if (!whatsappManager.isConnected()) {
      throw new Error("WhatsApp is not connected");
    }
    await whatsappManager.sendText(contact.phone, body);
    return;
  }

  throw new Error(`Unknown channel: ${channel}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
