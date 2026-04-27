import { Router, type IRouter } from "express";
import { whatsappManager } from "../lib/whatsapp";

const router: IRouter = Router();

router.get("/whatsapp/status", (_req, res): void => {
  res.json(whatsappManager.getStatus());
});

router.post("/whatsapp/connect", async (req, res): Promise<void> => {
  try {
    const status = await whatsappManager.start();
    res.json(status);
  } catch (err) {
    req.log.error({ err }, "Failed to start WhatsApp");
    res.status(500).json(whatsappManager.getStatus());
  }
});

router.post("/whatsapp/logout", async (req, res): Promise<void> => {
  try {
    const status = await whatsappManager.logout();
    res.json(status);
  } catch (err) {
    req.log.error({ err }, "Failed to logout WhatsApp");
    res.status(500).json(whatsappManager.getStatus());
  }
});

export default router;
