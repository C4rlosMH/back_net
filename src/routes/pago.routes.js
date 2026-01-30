import { Router } from "express";
import { generarCargo, registrarPago, getHistorial } from "../controllers/pago.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// POST /api/pagos/cargo -> Generar deuda manualmente (simulacro de corte)
router.post("/cargo", checkAuth, generarCargo);

// POST /api/pagos/abono -> Cliente paga dinero
router.post("/abono", checkAuth, registrarPago);

// GET /api/pagos/historial/1 -> Ver estado de cuenta del cliente 1
router.get("/historial/:id", checkAuth, getHistorial);

export default router;