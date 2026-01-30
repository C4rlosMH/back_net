import { Router } from "express";
import { getPlanes, createPlan, togglePlan } from "../controllers/plan.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js"

const router = Router();

router.get("/planes", checkAuth, getPlanes);
router.post("/planes", checkAuth, createPlan);
router.put("/planes/:id/toggle", checkAuth, togglePlan); // Para activar/desactivar

export default router;