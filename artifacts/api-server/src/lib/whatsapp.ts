import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "qr"
  | "connected"
  | "error";

export interface WhatsappStatusValue {
  state: ConnectionState;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  message: string | null;
  connectedAt: string | null;
}

const AUTH_DIR = path.resolve(
  process.env["WHATSAPP_AUTH_DIR"] ?? "./.whatsapp_auth",
);

const MAX_RECONNECT_ATTEMPTS = 5;

class WhatsappManager {
  private sock: WASocket | null = null;
  private status: WhatsappStatusValue = {
    state: "disconnected",
    qrDataUrl: null,
    phoneNumber: null,
    message: null,
    connectedAt: null,
  };
  private starting = false;
  private reconnectAttempts = 0;

  getStatus(): WhatsappStatusValue {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.state === "connected";
  }

  async start(): Promise<WhatsappStatusValue> {
    if (this.starting) return this.getStatus();
    if (this.status.state === "connected" && this.sock) return this.getStatus();

    this.starting = true;
    this.status = {
      state: "connecting",
      qrDataUrl: null,
      phoneNumber: null,
      message: "Initializing WhatsApp session...",
      connectedAt: null,
    };

    try {
      await fs.mkdir(AUTH_DIR, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      // Fetch the latest WA Web protocol version so the server doesn't reject
      // us with "Method Not Allowed" (code 405) for an outdated client version.
      let waVersion: [number, number, number] | undefined;
      try {
        const fetched = await fetchLatestBaileysVersion();
        waVersion = fetched.version;
        logger.info(
          { waVersion, isLatest: fetched.isLatest },
          "Fetched WhatsApp Web version",
        );
      } catch (err) {
        logger.warn(
          { err },
          "Could not fetch latest WA version, using Baileys default",
        );
      }

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ["Chrome (Linux)", "Chrome", "120.0.0"],
        syncFullHistory: false,
        ...(waVersion ? { version: waVersion } : {}),
      });
      this.sock = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          QRCode.toDataURL(qr, { width: 320, margin: 1 })
            .then((dataUrl) => {
              this.status = {
                state: "qr",
                qrDataUrl: dataUrl,
                phoneNumber: null,
                message:
                  "Open WhatsApp on your phone, go to Settings > Linked Devices, then scan this QR code.",
                connectedAt: null,
              };
            })
            .catch((err) => {
              logger.error({ err }, "Failed to render WhatsApp QR code");
            });
        }

        if (connection === "open") {
          const me = sock.user?.id ?? null;
          const phoneNumber = me ? me.split(":")[0]?.split("@")[0] ?? null : null;
          this.reconnectAttempts = 0;
          this.status = {
            state: "connected",
            qrDataUrl: null,
            phoneNumber: phoneNumber ?? null,
            message: "Connected",
            connectedAt: new Date().toISOString(),
          };
          logger.info({ phoneNumber }, "WhatsApp connected");
        }

        if (connection === "close") {
          const errAny = lastDisconnect?.error as
            | { output?: { statusCode?: number }; message?: string }
            | undefined;
          const code = errAny?.output?.statusCode;
          const loggedOut = code === DisconnectReason.loggedOut;
          logger.warn(
            { code, loggedOut },
            "WhatsApp connection closed",
          );

          if (loggedOut) {
            this.reconnectAttempts = 0;
            this.status = {
              state: "disconnected",
              qrDataUrl: null,
              phoneNumber: null,
              message: "Logged out. Start a new session to scan a new QR.",
              connectedAt: null,
            };
            this.sock = null;
            void this.clearAuth();
            return;
          }

          // Was the session previously connected? Then this is a transient drop.
          // Otherwise we are looping during the initial handshake — give up after
          // a few attempts so the user sees a real error instead of a tight loop.
          this.sock = null;
          this.reconnectAttempts += 1;

          if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            this.status = {
              state: "error",
              qrDataUrl: null,
              phoneNumber: null,
              message:
                code === 405
                  ? "WhatsApp rejected the connection (code 405). This usually means WhatsApp is blocking this server's IP — cloud/VPS hosts are commonly blocked. Try again later or run the app from a residential network."
                  : `WhatsApp connection failed (code ${code ?? "unknown"}). ${errAny?.message ?? "Please try again."}`,
              connectedAt: null,
            };
            void this.clearAuth();
            return;
          }

          this.status = {
            state: "connecting",
            qrDataUrl: null,
            phoneNumber: this.status.phoneNumber,
            message: `Reconnecting (attempt ${this.reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS})...`,
            connectedAt: this.status.connectedAt,
          };
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          const delay = Math.min(2000 * 2 ** (this.reconnectAttempts - 1), 32000);
          setTimeout(() => {
            this.starting = false;
            void this.start().catch((err) =>
              logger.error({ err }, "WhatsApp reconnect failed"),
            );
          }, delay);
        }
      });
    } catch (err) {
      logger.error({ err }, "Failed to initialize WhatsApp");
      this.status = {
        state: "error",
        qrDataUrl: null,
        phoneNumber: null,
        message: err instanceof Error ? err.message : "Unknown error",
        connectedAt: null,
      };
    } finally {
      this.starting = false;
    }

    return this.getStatus();
  }

  async logout(): Promise<WhatsappStatusValue> {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => undefined);
        this.sock.end(undefined);
      }
    } catch (err) {
      logger.warn({ err }, "WhatsApp logout encountered an error");
    }
    this.sock = null;
    this.reconnectAttempts = 0;
    await this.clearAuth();
    this.status = {
      state: "disconnected",
      qrDataUrl: null,
      phoneNumber: null,
      message: "Logged out.",
      connectedAt: null,
    };
    return this.getStatus();
  }

  private async clearAuth(): Promise<void> {
    try {
      await fs.rm(AUTH_DIR, { recursive: true, force: true });
    } catch (err) {
      logger.warn({ err }, "Failed to clear WhatsApp auth directory");
    }
  }

  async sendText(phone: string, message: string): Promise<void> {
    if (!this.sock || this.status.state !== "connected") {
      throw new Error("WhatsApp is not connected");
    }
    const jid = normalizePhoneToJid(phone);
    await this.sock.sendMessage(jid, { text: message });
  }
}

function normalizePhoneToJid(input: string): string {
  // Strip everything except digits
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) {
    throw new Error("Invalid phone number");
  }
  return `${digits}@s.whatsapp.net`;
}

export const whatsappManager = new WhatsappManager();
