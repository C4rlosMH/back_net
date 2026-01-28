import { Router } from "express";
import { PaymentController } from "../controllers/Payment.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();

// Registrar pago: POST /api/payments
router.post("/", [checkJwt], PaymentController.create);

// Ver historial de un cliente: GET /api/payments/history/1
router.get("/history/:clientId", [checkJwt], PaymentController.getByClient);

export default router;