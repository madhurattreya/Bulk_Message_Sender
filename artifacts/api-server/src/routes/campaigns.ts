import { Router, type IRouter } from "express";
import { eq, inArray, desc } from "drizzle-orm";
import {
  db,
  campaignsTable,
  campaignMessagesTable,
  contactsTable,
  templatesTable,
} from "@workspace/db";
import {
  CreateCampaignBody,
  GetCampaignParams,
  ListCampaignMessagesParams,
} from "@workspace/api-zod";
import { runCampaign } from "../lib/campaignRunner";

const router: IRouter = Router();

router.get("/campaigns", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(campaignsTable)
    .orderBy(desc(campaignsTable.id));
  res.json(rows);
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(row);
});

router.get(
  "/campaigns/:id/messages",
  async (req, res): Promise<void> => {
    const params = ListCampaignMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(campaignMessagesTable)
      .where(eq(campaignMessagesTable.campaignId, params.data.id))
      .orderBy(campaignMessagesTable.id);
    res.json(rows);
  },
);

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, parsed.data.templateId));
  if (!template) {
    res.status(400).json({ error: "Template not found" });
    return;
  }
  if (template.channel !== parsed.data.channel) {
    res
      .status(400)
      .json({ error: "Template channel does not match campaign channel" });
    return;
  }

  // Pick recipients
  const idsFilter = parsed.data.contactIds ?? null;
  const contacts =
    idsFilter && idsFilter.length
      ? await db
          .select()
          .from(contactsTable)
          .where(inArray(contactsTable.id, idsFilter))
      : await db.select().from(contactsTable);

  const eligible = contacts.filter((c) =>
    parsed.data.channel === "email" ? !!c.email : !!c.phone,
  );

  if (eligible.length === 0) {
    res
      .status(400)
      .json({ error: "No eligible recipients for this channel" });
    return;
  }

  const defaultRate = parsed.data.channel === "email" ? 1500 : 4000;
  const rateLimit = parsed.data.rateLimitMs ?? defaultRate;

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      name: parsed.data.name,
      channel: parsed.data.channel,
      templateId: parsed.data.templateId,
      status: "queued",
      totalRecipients: eligible.length,
      sentCount: 0,
      failedCount: 0,
      rateLimitMs: rateLimit,
    })
    .returning();

  if (!campaign) {
    res.status(500).json({ error: "Failed to create campaign" });
    return;
  }

  await db.insert(campaignMessagesTable).values(
    eligible.map((c) => ({
      campaignId: campaign.id,
      contactId: c.id,
      recipientName: c.name,
      recipientAddress:
        parsed.data.channel === "email" ? c.email : c.phone,
      status: "pending",
      attempts: 0,
    })),
  );

  // Kick off the campaign in the background — don't block the response.
  setImmediate(() => {
    runCampaign(campaign.id).catch((err) => {
      req.log.error({ err, campaignId: campaign.id }, "Campaign runner failed");
    });
  });

  res.status(201).json(campaign);
});

export default router;
