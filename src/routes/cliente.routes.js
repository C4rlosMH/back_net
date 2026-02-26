import { Router } from "express";
import { 
    createCliente, getClienteLogs, getClienteTickets, 
    getClientes, 
    updateCliente, // <--- Importar
    deleteCliente, // <--- Importar
    getCliente, resetPasswordPortal     // <--- Importar
} from "../controllers/cliente.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas base
router.post("/", checkAuth, createCliente);
router.get("/", checkAuth, getClientes);

// --- Rutas que faltaban (ID requerido) ---
router.get("/:id", checkAuth, getCliente);
router.put("/:id", checkAuth, updateCliente);    // <--- Esta arregla el error 404
router.delete("/:id", checkAuth, deleteCliente);
router.post("/:id/reset-password", checkAuth, resetPasswordPortal);

router.get("/:id/logs", checkAuth, getClienteLogs);
router.get("/:id/tickets", checkAuth, getClienteTickets);

export default router;