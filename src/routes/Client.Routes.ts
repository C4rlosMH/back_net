import { Router } from "express";
import { ClientController } from "../controllers/Client.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas de clientes requieren Token (seguridad)
router.get("/", [checkJwt], ClientController.getAll);
router.post("/", [checkJwt], ClientController.create);
router.get("/:id", [checkJwt], ClientController.getById);
router.put("/:id", [checkJwt], ClientController.update);
router.delete("/:id", [checkJwt], ClientController.delete);

export default router;