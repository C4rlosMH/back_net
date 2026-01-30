import { Router } from "express";
import { login, register, changePassword } from "../controllers/auth.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// --- Rutas Públicas (Cualquiera entra) ---
router.post("/login", login);

// --- Rutas Privadas (Requieren Token) ---
// Aplicamos el middleware checkAuth solo a esta ruta
router.post("/change-password", checkAuth, changePassword);

export default router;