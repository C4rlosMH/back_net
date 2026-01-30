import { Router } from "express";
import { createUser, getUsers, toggleUserStatus } from "../controllers/user.controller.js";
import { checkAuth, checkRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas requieren Token (checkAuth) y Rol ADMIN (checkRole)
router.use(checkAuth);
router.use(checkRole(["ADMIN"])); 

router.post("/", createUser);          // Crear nuevo usuario
router.get("/", getUsers);             // Ver lista de empleados
router.patch("/:id/status", toggleUserStatus); // Activar/Desactivar

export default router;