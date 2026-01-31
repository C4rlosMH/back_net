import { Router } from "express";
import { getCajas } from "../controllers/caja.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/", checkAuth, getCajas);
export default router;