import { Router } from "express";
import { UserController } from "../controllers/User.Controller";
import { checkJwt } from "../middlewares/auth.middleware";
import { checkRole } from "../middlewares/role.middleware"; // <--- Importar

const router = Router();

// Protegemos todas las rutas con JWT y ADEMÁS con Rol ADMIN
router.get("/", [checkJwt, checkRole(["ADMIN"])], UserController.getAll);
router.post("/", [checkJwt, checkRole(["ADMIN"])], UserController.create);
router.delete("/:id", [checkJwt, checkRole(["ADMIN"])], UserController.delete);
router.put("/:id/reset-password", [checkJwt, checkRole(["ADMIN"])], UserController.resetPassword);

// (Opcional) GetById podría ser para todos los roles, tú decides
router.get("/:id", [checkJwt], UserController.getById);

export default router;