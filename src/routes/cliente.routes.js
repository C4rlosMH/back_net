import { Router } from "express";
import { createCliente, getClientes } from "../controllers/cliente.controller.js";

const router = Router();

router.post("/", createCliente); // POST http://localhost:3000/api/clientes
router.get("/", getClientes);    // GET http://localhost:3000/api/clientes

export default router;