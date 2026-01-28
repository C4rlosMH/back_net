import { Router } from "express";
import { UserController } from "../controllers/Auth.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();

// Rutas Públicas (Auth)
//router.post("/register", UserController.register);
router.post("/login", UserController.login);

// Rutas Privadas (Solo con Token)
// Agregamos [checkJwt] antes del controlador
router.get("/", [checkJwt], UserController.getAll);       
router.get("/:id", [checkJwt], UserController.getById);   
router.put("/:id", [checkJwt], UserController.update);    
router.delete("/:id", [checkJwt], UserController.delete);
export default router;