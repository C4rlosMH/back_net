import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/dashboard
router.get("/",checkAuth, getDashboard);

export default router;