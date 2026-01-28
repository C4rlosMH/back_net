import { Router } from "express";
import { UserController } from "../controllers/User.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();

// Todas protegidas con Token
router.get("/", [checkJwt], UserController.getAll);
router.get("/:id", [checkJwt], UserController.getById);
router.post("/", [checkJwt], UserController.create); // Solo admin crea usuarios
router.delete("/:id", [checkJwt], UserController.delete);
router.put("/:id/reset-password", [checkJwt], UserController.resetPassword);

export default router;