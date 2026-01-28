import { Router } from "express";
import { SystemLogController } from "../controllers/SystemLog.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();

// GET /api/logs (Protegido)
router.get("/", [checkJwt], SystemLogController.getRecent);

export default router;