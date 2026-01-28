// src/routes/Payment.Routes.ts
import { Router } from "express";
import { PaymentController } from "../controllers/Payment.Controller";
// Importa tus middlewares (ej. checkJwt) si los usas
// import { checkJwt } from "../middlewares/checkJwt"; 

const router = Router();
const controller = new PaymentController(); // <-- CREAMOS LA INSTANCIA AQUÍ

// Ahora usamos 'controller.metodo' en lugar de 'PaymentController.metodo'
router.get("/", (req, res) => controller.getAll(req, res));
router.post("/", (req, res) => controller.create(req, res));
router.get("/history/:clientId", (req, res) => controller.getByClient(req, res));

export default router;