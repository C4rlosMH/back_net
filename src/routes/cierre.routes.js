import { Router } from "express";
import { getCierres } from "../controllers/cierre.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Ruta para obtener el historial de cierres quincenales (protegida por token)
router.get("/", checkAuth, getCierres);

export default router;