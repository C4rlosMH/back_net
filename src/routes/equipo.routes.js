import { Router } from "express";
import { createEquipo, asignarEquipos, getInventario } from "../controllers/equipo.controller.js";

const router = Router();

// Rutas de Inventario
router.post("/", createEquipo);           // Crear equipo nuevo
router.get("/", getInventario);           // Ver lista (soporta ?estado=ALMACEN)
router.post("/asignar", asignarEquipos);  // Asignar a cliente

export default router;