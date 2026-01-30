import { Router } from "express";
import { generarCargo, registrarPago, getHistorial } from "../controllers/pago.controller.js";

const router = Router();

// POST /api/pagos/cargo -> Generar deuda manualmente (simulacro de corte)
router.post("/cargo", generarCargo);

// POST /api/pagos/abono -> Cliente paga dinero
router.post("/abono", registrarPago);

// GET /api/pagos/historial/1 -> Ver estado de cuenta del cliente 1
router.get("/historial/:id", getHistorial);

export default router;