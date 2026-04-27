import { Router, type IRouter } from "express";
import { db, emailConfigTable } from "@workspace/db";
import { SaveEmailConfigBody } from "@workspace/api-zod";
import {
  getEmailConfig,
  clearEmailCache,
  verifyEmailConnection,
} from "../lib/email";

const router: IRouter = Router();

router.get("/email/config", async (_req, res): Promise<void> => {
  const cfg = await getEmailConfig();
  if (!cfg) {
    res.json({
      configured: false,
      host: null,
      port: null,
      secure: null,
      username: null,
      fromEmail: null,
      fromName: null,
    });
    return;
  }
  res.json({
    configured: true,
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    username: cfg.username,
    fromEmail: cfg.fromEmail,
    fromName: cfg.fromName,
  });
});

router.put("/email/config", async (req, res): Promise<void> => {
  const parsed = SaveEmailConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.delete(emailConfigTable);
  await db.insert(emailConfigTable).values({
    host: parsed.data.host,
    port: parsed.data.port,
    secure: parsed.data.secure,
    username: parsed.data.username,
    password: parsed.data.password,
    fromEmail: parsed.data.fromEmail,
    fromName: parsed.data.fromName,
  });
  clearEmailCache();

  res.json({
    configured: true,
    host: parsed.data.host,
    port: parsed.data.port,
    secure: parsed.data.secure,
    username: parsed.data.username,
    fromEmail: parsed.data.fromEmail,
    fromName: parsed.data.fromName,
  });
});

router.post("/email/test", async (_req, res): Promise<void> => {
  const result = await verifyEmailConnection();
  res.json(result);
});

export default router;
