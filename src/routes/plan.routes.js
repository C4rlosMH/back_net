import { Router } from "express";
import { getPlanes, createPlan, togglePlan } from "../controllers/plan.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js"

const router = Router();

router.get("/", checkAuth, getPlanes);
router.post("/", checkAuth, createPlan);
router.put("/:id/toggle", checkAuth, togglePlan); // Para activar/desactivar

export default router;