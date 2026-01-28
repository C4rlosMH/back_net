// src/routes/Client.Routes.ts
import { Router } from "express";
import { ClientController } from "../controllers/Client.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();
const clientCtrl = new ClientController(); // Instancia única

// Usamos funciones flecha para que el 'this' no se pierda en el controlador
router.get("/", [checkJwt], (req: any, res: any) => clientCtrl.getAll(req, res));
router.post("/", [checkJwt], (req: any, res: any) => clientCtrl.create(req, res));
router.put("/:id", [checkJwt], (req: any, res: any) => clientCtrl.update(req, res));
router.delete("/:id", [checkJwt], (req: any, res: any) => clientCtrl.delete(req, res));

export default router;