import { getPerfilClienteService, getHistorialPagosService, aplazarPagoService, crearTicketService,
    getTicketsClienteService, getMensajesTicketService, responderTicketService, actualizarPerfilService,
    cambiarPasswordService } from "../services/portal.service.js";
import { generarLinkDePago } from "../services/mercadopago.service.js";
import ping from 'ping';

export const getPerfilCliente = async (req, res) => {
    try {
        // El id viene inyectado de forma segura desde el JWT gracias al middleware checkAuth
        const { id } = req.user; 
        
        const perfil = await getPerfilClienteService(id);
        
        res.json(perfil);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// NUEVA FUNCIÓN: Generar pago seguro para el cliente
export const generarPagoPortal = async (req, res) => {
    try {
        const { id } = req.user; 
        // El frontend nos dirá qué opción eligió el cliente
        const { tipo_pago, monto_personalizado } = req.body; 
        
        const cliente = await getPerfilClienteService(id);
        const deudaTotal = Number(cliente.saldo_actual) + Number(cliente.deuda_historica) - Number(cliente.saldo_a_favor);

        let montoAPagar = 0;
        let concepto = "";

        // Evaluamos la opción seleccionada por el cliente
        switch (tipo_pago) {
            case "DEUDA_TOTAL":
                if (deudaTotal <= 0) {
                    return res.status(400).json({ message: "No tienes deuda pendiente." });
                }
                montoAPagar = deudaTotal;
                concepto = `Pago de Deuda Total - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            case "MENSUALIDAD":
                // Pagar el mes por adelantado o su tarifa base si no tiene deuda acumulada
                if (!cliente.plan) {
                    return res.status(400).json({ message: "No tienes un plan asignado." });
                }
                montoAPagar = Number(cliente.plan.precio_mensual);
                concepto = `Pago de Mensualidad (${cliente.plan.nombre}) - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            case "OTRO_MONTO":
                // El cliente decide cuánto abonar
                if (!monto_personalizado || Number(monto_personalizado) < 20) {
                    return res.status(400).json({ message: "El monto minimo para abonar es de $20.00" });
                }
                montoAPagar = Number(monto_personalizado);
                concepto = `Abono a cuenta - Suscriptor: ${cliente.numero_suscriptor}`;
                break;

            default:
                return res.status(400).json({ message: "Tipo de pago no valido." });
        }

        // Generamos el link con TU servicio de Mercado Pago usando el monto calculado
        const url_pago = await generarLinkDePago(cliente, montoAPagar, concepto);

        // Devolvemos la URL al frontend para que redireccione al cliente
        res.json({ url_pago, monto_a_pagar: montoAPagar });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getHistorialPagos = async (req, res) => {
    try {
        const { id } = req.user; 
        
        const historial = await getHistorialPagosService(id);
        
        // Devolvemos el arreglo de pagos (puede estar vacio si es un cliente nuevo)
        res.json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const aplazarPagoPortal = async (req, res) => {
    try {
        const { id, numero_suscriptor } = req.user; 

        const resultado = await aplazarPagoService(id);

        // Dejamos evidencia en el panel de auditoria
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
        
        // Reutilizamos el servicio que ya tienes para traer los datos del cliente
        const cliente = await getPerfilClienteService(id);

        if (!cliente.ip_asignada) {
            return res.status(400).json({ message: "No tienes una IP asignada en el sistema para realizar el test." });
        }

        // Hacemos el ping a la IP del cliente
        let resPing = await ping.promise.probe(cliente.ip_asignada, {
            timeout: 2, // Espera maxima de 2 segundos
        });

        if (resPing.alive) {
            // resPing.time devuelve los milisegundos
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
        // Ahora extraemos también la 'prioridad' que envía el nuevo modal
        const { categoria, asunto, descripcion, prioridad } = req.body;

        // Validación de campos obligatorios
        if (!categoria || !asunto || !descripcion || !prioridad) {
            return res.status(400).json({ 
                message: "Todos los campos, incluyendo la prioridad, son obligatorios." 
            });
        }

        // Pasamos el objeto completo al servicio
        const nuevoTicket = await crearTicketService(id, { 
            categoria, 
            asunto, 
            descripcion, 
            prioridad // BAJA, MEDIA o ALTA
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
        const tickets = await getTicketsClienteService(id);
        res.json(tickets);
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