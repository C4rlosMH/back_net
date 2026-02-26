import { getPerfilClienteService, getHistorialPagosService, aplazarPagoService, crearTicketService,
    getTicketsClienteService, getMensajesTicketService, responderTicketService, actualizarPerfilService,
    cambiarPasswordService } from "../services/portal.service.js";
import { generarLinkDePago } from "../services/mercadopago.service.js";
import { Ticket } from "../entities/Ticket.js";
import { TicketMensaje } from "../entities/TicketMensaje.js";
import { AppDataSource } from "../config/data-source.js"; // IMPORTACIÓN AGREGADA
import ping from 'ping';

const ticketRepo = AppDataSource.getRepository(Ticket);
const mensajeRepo = AppDataSource.getRepository(TicketMensaje);

export const getPerfilCliente = async (req, res) => {
    try {
        const { id } = req.user; 
        
        const perfil = await getPerfilClienteService(id);
        
        res.json(perfil);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const generarPagoPortal = async (req, res) => {
    try {
        const { id } = req.user; 
        const { tipo_pago, monto_personalizado } = req.body; 
        
        const cliente = await getPerfilClienteService(id);
        const deudaTotal = Number(cliente.saldo_actual) + Number(cliente.deuda_historica) - Number(cliente.saldo_a_favor);

        let montoAPagar = 0;
        let concepto = "";

        switch (tipo_pago) {
            case "DEUDA_TOTAL":
                if (deudaTotal <= 0) {
                    return res.status(400).json({ message: "No tienes deuda pendiente." });
                }
                montoAPagar = deudaTotal;
                concepto = `Pago de Deuda Total - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            case "MENSUALIDAD":
                if (!cliente.plan) {
                    return res.status(400).json({ message: "No tienes un plan asignado." });
                }
                montoAPagar = Number(cliente.plan.precio_mensual);
                concepto = `Pago de Mensualidad (${cliente.plan.nombre}) - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            case "OTRO_MONTO":
                if (!monto_personalizado || Number(monto_personalizado) < 20) {
                    return res.status(400).json({ message: "El monto minimo para abonar es de $20.00" });
                }
                montoAPagar = Number(monto_personalizado);
                concepto = `Abono a cuenta - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            default:
                return res.status(400).json({ message: "Tipo de pago no valido." });
        }

        const url_pago = await generarLinkDePago(cliente, montoAPagar, concepto);

        res.json({ url_pago, monto_a_pagar: montoAPagar });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getHistorialPagos = async (req, res) => {
    try {
        const { id } = req.user; 
        
        const historial = await getHistorialPagosService(id);
        
        res.json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const aplazarPagoPortal = async (req, res) => {
    try {
        const { id, numero_suscriptor } = req.user; 

        const resultado = await aplazarPagoService(id);

        registrarLogCliente(
            numero_suscriptor,
            "APLAZAMIENTO_PAGO",
            `El cliente utilizo la funcion de aplazar su mensualidad.`,
            id
        );

        res.json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const pingClientePortal = async (req, res) => {
    try {
        const { id } = req.user; 
        
        const cliente = await getPerfilClienteService(id);

        if (!cliente.ip_asignada) {
            return res.status(400).json({ message: "No tienes una IP asignada en el sistema para realizar el test." });
        }

        let resPing = await ping.promise.probe(cliente.ip_asignada, {
            timeout: 2, 
        });

        if (resPing.alive) {
            res.json({ ping: Math.round(resPing.time) });
        } else {
            res.status(404).json({ message: "Tu equipo no responde. Verifica que este encendido." });
        }
    } catch (error) {
        res.status(500).json({ message: "Error interno al realizar el test de red." });
    }
};

export const crearTicketPortal = async (req, res) => {
    try {
        const { id } = req.user;
        const { categoria, asunto, descripcion, prioridad } = req.body;

        if (!categoria || !asunto || !descripcion || !prioridad) {
            return res.status(400).json({ 
                message: "Todos los campos, incluyendo la prioridad, son obligatorios." 
            });
        }

        const nuevoTicket = await crearTicketService(id, { 
            categoria, 
            asunto, 
            descripcion, 
            prioridad 
        });

        res.status(201).json({ 
            message: "Ticket creado exitosamente", 
            ticket: nuevoTicket 
        });
    } catch (error) {
        console.error("Error al crear ticket:", error);
        res.status(500).json({ 
            message: "Error interno al crear el ticket." 
        });
    }
};

export const getTicketsPortal = async (req, res) => {
    try {
        const { id } = req.user;
        
        // 1. Obtenemos todos los tickets del cliente
        const tickets = await ticketRepo.find({
            where: { cliente: { id: id } }
        });

        // 2. Mapeamos cada ticket para buscar su último mensaje
        const ticketsConNotificacion = await Promise.all(tickets.map(async (ticket) => {
            const ultimoMensaje = await mensajeRepo.findOne({
                where: { ticket: { id: ticket.id } },
                order: { fecha_creacion: "DESC" }
            });

            // 3. Calculamos la fecha real de última actividad
            const fechaActividad = ultimoMensaje 
                ? (new Date(ultimoMensaje.fecha_creacion) > new Date(ticket.fecha_actualizacion) 
                    ? ultimoMensaje.fecha_creacion 
                    : ticket.fecha_actualizacion)
                : ticket.fecha_actualizacion;

            return {
                ...ticket,
                // Si el último mensaje es del ADMIN y el ticket no está cerrado, hay novedad para el cliente
                tiene_mensajes_nuevos: ultimoMensaje && ultimoMensaje.remitente === "ADMIN" && ticket.estado !== "CERRADO" && ticket.estado !== "RESUELTO",
                fecha_actividad: fechaActividad
            };
        }));

        // 4. Ordenamos: Los que tienen actividad más reciente van arriba
        ticketsConNotificacion.sort((a, b) => new Date(b.fecha_actividad) - new Date(a.fecha_actividad));

        res.json(ticketsConNotificacion);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el historial de tickets." });
    }
};

export const getMensajesPortal = async (req, res) => {
    try {
        const cliente_id = req.user.id;
        const ticket_id = parseInt(req.params.ticketId);

        const mensajes = await getMensajesTicketService(cliente_id, ticket_id);
        res.json(mensajes);
    } catch (error) {
        res.status(400).json({ message: error.message || "Error al obtener mensajes." });
    }
};

export const responderTicketPortal = async (req, res) => {
    try {
        const cliente_id = req.user.id;
        const ticket_id = parseInt(req.params.ticketId);
        const { mensaje } = req.body;

        if (!mensaje || mensaje.trim() === "") {
            return res.status(400).json({ message: "El mensaje no puede estar vacio." });
        }

        const nuevoMensaje = await responderTicketService(cliente_id, ticket_id, mensaje);
        res.status(201).json({ message: "Respuesta enviada", data: nuevoMensaje });
    } catch (error) {
        res.status(400).json({ message: error.message || "Error al enviar la respuesta." });
    }
};

export const actualizarPerfilPortal = async (req, res) => {
    try {
        const cliente_id = req.user.id;
        const { email, telefono } = req.body;

        const clienteActualizado = await actualizarPerfilService(cliente_id, { email, telefono });
        res.json({ message: "Datos actualizados correctamente.", cliente: clienteActualizado });
    } catch (error) {
        res.status(400).json({ message: error.message || "Error al actualizar el perfil." });
    }
};

export const cambiarPasswordPortal = async (req, res) => {
    try {
        const cliente_id = req.user.id;
        const { password_actual, nueva_password } = req.body;

        if (!password_actual || !nueva_password) {
            return res.status(400).json({ message: "Debes enviar la contrasena actual y la nueva." });
        }

        if (nueva_password.length < 6) {
            return res.status(400).json({ message: "La nueva contrasena debe tener al menos 6 caracteres." });
        }

        await cambiarPasswordService(cliente_id, password_actual, nueva_password);
        res.json({ message: "Contrasena actualizada exitosamente." });
    } catch (error) {
        res.status(400).json({ message: error.message || "Error al procesar el cambio de contrasena." });
    }
};

export const calificarTicketPortal = async (req, res) => {
    try {
        const { ticketId } = req.params; 
        const { calificacion, comentario } = req.body;
        const cliente_id = req.user.id; 

        const ticket = await ticketRepo.findOne({ 
            where: { 
                id: parseInt(ticketId),
                cliente: { id: cliente_id } 
            } 
        });

        if (!ticket) {
            return res.status(404).json({ message: "Ticket no encontrado o no te pertenece" });
        }

        if (ticket.estado !== "CERRADO" && ticket.estado !== "RESUELTO") {
            return res.status(400).json({ message: "Solo se pueden calificar tickets que ya están cerrados." });
        }

        if (calificacion < 1 || calificacion > 5) {
            return res.status(400).json({ message: "La calificación debe ser entre 1 y 5." });
        }

        ticket.calificacion = parseInt(calificacion);
        ticket.comentario_calificacion = comentario || null;

        await ticketRepo.save(ticket);

        return res.json({ message: "Calificación guardada exitosamente", ticket });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};