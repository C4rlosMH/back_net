import { Router } from "express";
import { createUser, getUsers, toggleUserStatus } from "../controllers/user.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas requieren Token (checkAuth) y Rol ADMIN (checkRole)

router.post("/", checkAuth, createUser);          // Crear nuevo usuario
router.get("/", checkAuth, getUsers);             // Ver lista de empleados
router.patch("/:id/status", checkAuth, toggleUserStatus); // Activar/Desactivar

export default router;