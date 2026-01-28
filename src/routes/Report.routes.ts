import { Router } from "express";
import { ReportController } from "../controllers/Report.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();

// Dashboard General (GET)
router.get("/dashboard", [checkJwt], ReportController.getDashboardStats);

// Reporte Financiero Personalizado (POST para enviar fechas)
router.post("/income", [checkJwt], ReportController.getIncomeReport);

export default router;