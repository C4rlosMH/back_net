import { Router } from "express";
// ⚠️ CORRECCIÓN: Importamos 'getDashboardStats' (no getDashboard)
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// ⚠️ CORRECCIÓN: Usamos la ruta "/stats" para que coincida con el frontend
// URL Final: /api/dashboard/stats
router.get("/stats", checkAuth, getDashboardStats);

export default router;