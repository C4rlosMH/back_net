import { Router } from "express";
import { 
    obtenerInsumos, 
    crearInsumo, 
    actualizarCantidad, 
    eliminarInsumo 
} from "../controllers/insumo.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(checkAuth);

router.get("/", obtenerInsumos);
router.post("/", crearInsumo);
router.put("/:id", actualizarCantidad);
router.delete("/:id", eliminarInsumo);

export default router;