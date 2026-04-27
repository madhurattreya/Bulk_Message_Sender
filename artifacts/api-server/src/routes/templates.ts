import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import {
  CreateTemplateBody,
  UpdateTemplateBody,
  UpdateTemplateParams,
  DeleteTemplateParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/templates", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(templatesTable)
    .orderBy(templatesTable.id);
  res.json(rows);
});

router.post("/templates", async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(templatesTable)
    .values({
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject: parsed.data.subject ?? null,
      body: parsed.data.body,
    })
    .returning();
  res.status(201).json(row);
});

router.patch("/templates/:id", async (req, res): Promise<void> => {
  const params = UpdateTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(templatesTable)
    .set({
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject: parsed.data.subject ?? null,
      body: parsed.data.body,
    })
    .where(eq(templatesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(row);
});

router.delete("/templates/:id", async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(templatesTable).where(eq(templatesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
