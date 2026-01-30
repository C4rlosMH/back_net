import { Router } from "express";
import { createCliente, getClientes } from "../controllers/cliente.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", checkAuth, createCliente); // POST http://localhost:3000/api/clientes
router.get("/", checkAuth, getClientes);    // GET http://localhost:3000/api/clientes

export default router;