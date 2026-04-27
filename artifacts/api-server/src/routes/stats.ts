import { Router, type IRouter } from "express";
import { sql, desc } from "drizzle-orm";
import {
  db,
  contactsTable,
  campaignsTable,
} from "@workspace/db";
import { getEmailConfig } from "../lib/email";
import { whatsappManager } from "../lib/whatsapp";

const router: IRouter = Router();

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const [contactCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(contactsTable);
  const [campaignCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(campaignsTable);
  const [sumsRow] = await db
    .select({
      sent: sql<number>`coalesce(sum(${campaignsTable.sentCount}), 0)::int`,
      failed: sql<number>`coalesce(sum(${campaignsTable.failedCount}), 0)::int`,
    })
    .from(campaignsTable);

  const recent = await db
    .select()
    .from(campaignsTable)
    .orderBy(desc(campaignsTable.id))
    .limit(5);

  const cfg = await getEmailConfig();
  const wa = whatsappManager.getStatus();

  res.json({
    totalContacts: contactCountRow?.c ?? 0,
    totalCampaigns: campaignCountRow?.c ?? 0,
    totalSent: sumsRow?.sent ?? 0,
    totalFailed: sumsRow?.failed ?? 0,
    emailConfigured: !!cfg,
    whatsappConnected: wa.state === "connected",
    recentCampaigns: recent,
  });
});

export default router;
