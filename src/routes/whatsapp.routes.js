import { Router } from "express";
import { enviarMensajeManual, getStatus, logout, reiniciar } from "../controllers/whatsapp.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// POST /api/whatsapp/send
router.post("/send", checkAuth, enviarMensajeManual);

router.get("/status", checkAuth, getStatus); // El frontend hará polling a esta ruta
router.post("/logout", checkAuth, logout);   // Para botón "Desvincular"
router.post("/restart", checkAuth, reiniciar);

export default router;