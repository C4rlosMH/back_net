import { Router } from "express";
import { 
    getTickets, deleteTicket, calificarTicket,
    getTicketMensajes, getDashboardKpisTickets,
    responderTicket, 
    updateEstadoTicket, getMetricasSoporte,
    asignarTicket
} from "../controllers/ticket.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", checkAuth, getTickets);
router.get("/metricas", checkAuth, getMetricasSoporte);
router.get("/:id/mensajes", checkAuth, getTicketMensajes);
router.post("/:id/mensajes", checkAuth, responderTicket);
router.put("/:id/estado", checkAuth, updateEstadoTicket);
router.put("/:id/asignar", checkAuth, asignarTicket);
router.put("/:id/calificar", checkAuth, calificarTicket);
router.delete("/:id", checkAuth, deleteTicket);

router.get("/dashboard-kpis", checkAuth, getDashboardKpisTickets);


export default router;