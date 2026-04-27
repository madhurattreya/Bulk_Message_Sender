import nodemailer, { type Transporter } from "nodemailer";
import { db, emailConfigTable, type EmailConfigRow } from "@workspace/db";
import { logger } from "./logger";

let cachedConfig: EmailConfigRow | null = null;
let cachedTransporter: Transporter | null = null;

export async function getEmailConfig(): Promise<EmailConfigRow | null> {
  if (cachedConfig) return cachedConfig;
  const rows = await db.select().from(emailConfigTable).limit(1);
  cachedConfig = rows[0] ?? null;
  return cachedConfig;
}

export function clearEmailCache(): void {
  cachedConfig = null;
  if (cachedTransporter) {
    cachedTransporter.close();
  }
  cachedTransporter = null;
}

export async function getTransporter(): Promise<Transporter> {
  const cfg = await getEmailConfig();
  if (!cfg) {
    throw new Error("Email is not configured. Save SMTP settings first.");
  }
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.username,
      pass: cfg.password,
    },
  });
  return cachedTransporter;
}

export async function verifyEmailConnection(): Promise<{
  success: boolean;
  message: string | null;
}> {
  try {
    const t = await getTransporter();
    await t.verify();
    return { success: true, message: "SMTP connection verified." };
  } catch (err) {
    logger.warn({ err }, "Email verification failed");
    return {
      success: false,
      message: err instanceof Error ? err.message : "Verification failed",
    };
  }
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const cfg = await getEmailConfig();
  if (!cfg) throw new Error("Email is not configured");
  const t = await getTransporter();
  await t.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to,
    subject,
    html,
    text: htmlToText(html),
  });
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}
