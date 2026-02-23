import { Router } from "express";
import { 
    login, 
    changePassword, 
    loginCliente, 
    changePasswordCliente // <-- Nueva importacion
} from "../controllers/auth.controller.js";
import { checkAuth, checkRole } from "../middlewares/auth.middleware.js";

const router = Router();

// --- Rutas publicas ---
router.post("/login", login);
router.post("/cliente/login", loginCliente);

// --- Rutas Privadas (Requieren Token de Administrador) ---
router.post("/change-password", checkAuth, checkRole(["ADMIN"]), changePassword);

// --- Rutas Privadas (Requieren Token de Cliente) ---
router.post("/cliente/change-password", checkAuth, checkRole(["CLIENTE"]), changePasswordCliente);

export default router;