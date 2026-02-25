import { Router } from "express";
import { getPerfilCliente, generarPagoPortal, getHistorialPagos, aplazarPagoPortal, pingClientePortal, crearTicketPortal,
    getTicketsPortal, getMensajesPortal, responderTicketPortal, actualizarPerfilPortal,
    cambiarPasswordPortal } from "../controllers/portal.controller.js";
import { checkAuth, checkRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Middleware global: Solo clientes con Token válido entran aquí
router.use(checkAuth, checkRole(["CLIENTE"]));

// Rutas
router.get("/dashboard", getPerfilCliente);
router.post("/pagar", generarPagoPortal); // <-- Nueva ruta segura para cobrar
router.get("/historial", getHistorialPagos); // <-- Nueva ruta para el historial
router.post("/aplazar", aplazarPagoPortal);
router.get("/ping", pingClientePortal);
router.post("/tickets", crearTicketPortal); // Nueva ruta para crear tickets
router.get("/tickets", getTicketsPortal); // Nueva ruta para listar los tickets del cliente
router.get("/tickets/:ticketId/mensajes", getMensajesPortal); // Nueva ruta para obtener mensajes de un ticket
router.post("/tickets/:ticketId/mensajes", responderTicketPortal); // Nueva ruta para responder a un ticket

router.put("/perfil", actualizarPerfilPortal);
router.put("/password", cambiarPasswordPortal);

export default router;