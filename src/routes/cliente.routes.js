import { Router } from "express";
import { 
    createCliente, 
    getClientes, 
    updateCliente, // <--- Importar
    deleteCliente, // <--- Importar
    getCliente     // <--- Importar
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

export default router;