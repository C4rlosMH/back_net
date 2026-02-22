import { Router } from "express";
import { webhookMercadoPago, generarLinkCobro } from "../controllers/mercadopago.controller.js";

const router = Router();

// Ruta para probar la generación del link (puedes usar el ID de tu cliente de prueba)
router.post("/generar-link/:id", generarLinkCobro);

// RUTA CRÍTICA: El Webhook (Pública para que MercadoPago no reciba el error 401)
router.post("/webhook", webhookMercadoPago);

export default router;