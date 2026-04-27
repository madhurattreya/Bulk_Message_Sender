import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactsRouter from "./contacts";
import templatesRouter from "./templates";
import emailRouter from "./email";
import whatsappRouter from "./whatsapp";
import campaignsRouter from "./campaigns";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactsRouter);
router.use(templatesRouter);
router.use(emailRouter);
router.use(whatsappRouter);
router.use(campaignsRouter);
router.use(statsRouter);

export default router;
