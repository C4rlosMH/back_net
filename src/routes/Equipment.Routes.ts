import { Router } from "express";
import { EquipmentController } from "../controllers/Equipment.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", [checkJwt], EquipmentController.getAll);
router.post("/", [checkJwt], EquipmentController.create);
router.get("/:id", [checkJwt], EquipmentController.getById);   // Ver detalle
router.put("/:id", [checkJwt], EquipmentController.update);    // Editar
router.delete("/:id", [checkJwt], EquipmentController.delete); // Eliminar

export default router;