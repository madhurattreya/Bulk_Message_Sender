import nodemailer, { type Transporter } from "nodemailer";
import { db, emailConfigTable, type EmailConfigRow } from "@workspace/db";
import { logger } from "./logger";

export interface SmtpCredentials {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

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

function buildTransporter(creds: SmtpCredentials): Transporter {
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    // For STARTTLS providers like Zoho / Gmail / Office365 on port 587,
    // we explicitly require TLS upgrade; harmless when secure=true.
    requireTLS: !creds.secure,
    auth: {
      user: creds.username,
      pass: creds.password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

export async function getTransporter(): Promise<Transporter> {
  const cfg = await getEmailConfig();
  if (!cfg) {
    throw new Error("Email is not configured. Save SMTP settings first.");
  }
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = buildTransporter({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    username: cfg.username,
    password: cfg.password,
  });
  return cachedTransporter;
}

export async function verifyEmailConnection(
  override?: SmtpCredentials,
): Promise<{
  success: boolean;
  message: string | null;
}> {
  let transporter: Transporter | null = null;
  let usingOverride = false;
  try {
    if (override) {
      transporter = buildTransporter(override);
      usingOverride = true;
    } else {
      transporter = await getTransporter();
    }
    await transporter.verify();
    return { success: true, message: "SMTP connection verified." };
  } catch (err) {
    logger.warn({ err }, "Email verification failed");
    return {
      success: false,
      message: err instanceof Error ? err.message : "Verification failed",
    };
  } finally {
    if (usingOverride && transporter) {
      transporter.close();
    }
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
