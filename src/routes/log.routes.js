import { Router } from "express";
import { getLogs } from "../controllers/log.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js"; // Asumiendo que usas auth

const router = Router();
router.get("/", checkAuth, getLogs);
export default router;