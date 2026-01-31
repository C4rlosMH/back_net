import { Router } from "express";
import { 
    getCajas, 
    createCaja,  // <--- Importar
    updateCaja,  // <--- Importar
    deleteCaja   // <--- Importar
} from "../controllers/caja.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas CRUD
router.get("/", checkAuth, getCajas);
router.post("/", checkAuth, createCaja);       // <--- Faltaba esta (Crear)
router.put("/:id", checkAuth, updateCaja);     // <--- Faltaba esta (Editar)
router.delete("/:id", checkAuth, deleteCaja);  // <--- Faltaba esta (Eliminar)

export default router;