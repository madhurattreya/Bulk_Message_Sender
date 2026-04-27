import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";
import { db, contactsTable } from "@workspace/db";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/contacts", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contactsTable)
    .orderBy(contactsTable.id);
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      extraJson: r.extraJson,
      createdAt: r.createdAt,
    })),
  );
});

router.delete("/contacts", async (_req, res): Promise<void> => {
  await db.delete(contactsTable);
  res.sendStatus(204);
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db
    .delete(contactsTable)
    .where(eq(contactsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.sendStatus(204);
});

router.post(
  "/contacts/upload",
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "Missing file (field name: file)" });
      return;
    }
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch (err) {
      req.log.warn({ err }, "Failed to parse upload");
      res.status(400).json({ error: "Could not parse file" });
      return;
    }

    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      res.status(400).json({ error: "Workbook has no sheets" });
      return;
    }
    const sheet = workbook.Sheets[firstSheet];
    if (!sheet) {
      res.status(400).json({ error: "Workbook has no sheets" });
      return;
    }
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
    });
    if (rawRows.length === 0) {
      res.status(400).json({ error: "File contains no rows" });
      return;
    }

    const firstRow = rawRows[0];
    const allColumns = firstRow ? Object.keys(firstRow) : [];

    const findCol = (candidates: string[]): string | null => {
      const lower = allColumns.map((c) => c.toLowerCase().trim());
      for (const cand of candidates) {
        const idx = lower.findIndex(
          (l) => l === cand || l.includes(cand),
        );
        if (idx !== -1) return allColumns[idx] ?? null;
      }
      return null;
    };

    const nameCol = findCol(["name", "full name", "fullname", "first name", "contact"]);
    const emailCol = findCol(["email", "e-mail", "mail"]);
    const phoneCol = findCol(["phone", "mobile", "whatsapp", "number", "tel"]);

    let inserted = 0;
    let skipped = 0;
    for (const row of rawRows) {
      const name = nameCol ? toText(row[nameCol]) : "";
      const email = emailCol ? toText(row[emailCol]) : "";
      const phone = phoneCol ? toText(row[phoneCol]) : "";

      if (!name && !email && !phone) {
        skipped += 1;
        continue;
      }

      const extra: Record<string, unknown> = {};
      for (const key of allColumns) {
        if (key === nameCol || key === emailCol || key === phoneCol) continue;
        extra[key] = row[key];
      }

      await db.insert(contactsTable).values({
        name: name || email || phone || "(no name)",
        email: email || null,
        phone: phone || null,
        extraJson: Object.keys(extra).length ? JSON.stringify(extra) : null,
      });
      inserted += 1;
    }

    res.json({
      inserted,
      skipped,
      total: rawRows.length,
      columns: allColumns,
    });
  },
);

function toText(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export default router;
