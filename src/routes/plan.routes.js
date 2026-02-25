import { Router } from "express";
import { getPlanes, createPlan, togglePlan, updatePlan, getPlanesWeb } from "../controllers/plan.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js"

const router = Router();

// --- RUTA PÚBLICA (No necesita checkAuth) ---
router.get("/publicos", getPlanesWeb);

router.get("/", checkAuth, getPlanes);
router.post("/", checkAuth, createPlan);
router.put("/planes/:id",checkAuth, updatePlan);
router.put("/:id/toggle", checkAuth, togglePlan); // Para activar/desactivar

export default router;