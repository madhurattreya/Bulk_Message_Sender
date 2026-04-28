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

router.post("/email/test", async (req, res): Promise<void> => {
  // Accept the SMTP credentials in the body so the user can test before saving.
  // Falls back to the saved configuration when no body is provided.
  const body = (req.body ?? {}) as Record<string, unknown>;
  const hasOverride =
    typeof body["host"] === "string" &&
    typeof body["port"] === "number" &&
    typeof body["username"] === "string" &&
    typeof body["password"] === "string" &&
    body["password"].length > 0;

  if (hasOverride) {
    const result = await verifyEmailConnection({
      host: body["host"] as string,
      port: body["port"] as number,
      secure: Boolean(body["secure"]),
      username: body["username"] as string,
      password: body["password"] as string,
    });
    res.json(result);
    return;
  }

  const result = await verifyEmailConnection();
  res.json(result);
});

export default router;
