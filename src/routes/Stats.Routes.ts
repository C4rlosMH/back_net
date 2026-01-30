// backend/src/routes/Stats.Routes.ts
import { Router } from "express";
import { StatsController } from "../controllers/Stats.Controller"; // Ajusta la ruta si es necesario
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();
const controller = new StatsController();

// Ruta protegida: Solo usuarios logueados ven los números
router.get("/dashboard", [checkJwt], (req: any, res: any) => controller.getDashboardStats(req, res));

export default router;