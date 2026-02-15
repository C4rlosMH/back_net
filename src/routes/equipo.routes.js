import { Router } from "express";
import { createEquipo, asignarEquipos, getInventario, deleteEquipo } from "../controllers/equipo.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas de Inventario
router.post("/", checkAuth, createEquipo);           // Crear equipo nuevo
router.get("/",checkAuth, getInventario);           // Ver lista (soporta ?estado=ALMACEN)
router.post("/asignar", checkAuth, asignarEquipos);  // Asignar a cliente
router.delete("/:id", checkAuth, deleteEquipo);

export default router;