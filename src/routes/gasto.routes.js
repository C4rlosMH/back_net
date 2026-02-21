import { Router } from "express";
import { obtenerGastos, crearGasto, eliminarGasto } from "../controllers/gasto.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js"; // Asegúrate de que este nombre coincida con tu middleware

const router = Router();

// Todas las rutas de gastos estarán protegidas
router.use(checkAuth);

router.get("/", obtenerGastos);
router.post("/", crearGasto);
router.delete("/:id", eliminarGasto);

export default router;