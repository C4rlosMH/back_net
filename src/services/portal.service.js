import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { activarClientePPPoE } from "./mikrotik.service.js";
import { Ticket } from "../entities/Ticket.js";
import { TicketMensaje } from "../entities/TicketMensaje.js";
import bcrypt from "bcryptjs";

export const getPerfilClienteService = async (clienteId) => {
    const clienteRepo = AppDataSource.getRepository(Cliente);
    
    const cliente = await clienteRepo.findOne({
        where: { id: clienteId },
        relations: ["plan", "equipos"] // Traemos la info del plan y sus equipos instalados
    });

    if (!cliente) {
        throw new Error("Cliente no encontrado.");
    }

    // Por seguridad, nos aseguramos de no enviar la contraseña bajo ninguna circunstancia
    delete cliente.password;

    return cliente;
};

export const getHistorialPagosService = async (clienteId) => {
    const movRepo = AppDataSource.getRepository(MovimientoFinanciero);
    
    // Buscamos los movimientos del cliente que sean ingresos (pagos)
    const historial = await movRepo.find({
        where: { 
            cliente: { id: clienteId },
            tipo: "INGRESO" 
        },
        order: { 
            fecha: "DESC" // Ordenamos para que el pago mas reciente salga primero
        },
        take: 30 // Limitamos a los ultimos 30 pagos para no saturar la red
    });

    return historial;
};

export const aplazarPagoService = async (clienteId) => {
    const clienteRepo = AppDataSource.getRepository(Cliente);
    
    // Traemos al cliente asegurandonos de tener su usuario_pppoe para mandarlo a Mikrotik
    const cliente = await clienteRepo.findOne({ 
        where: { id: clienteId },
        select: ["id", "saldo_actual", "saldo_aplazado", "estado", "usuario_pppoe"] 
    });

    if (!cliente) throw new Error("Cliente no encontrado.");

    if (Number(cliente.saldo_actual) <= 0) {
        throw new Error("No tienes un saldo actual pendiente para aplazar.");
    }

    if (Number(cliente.saldo_aplazado) > 0) {
        throw new Error("Ya tienes un saldo aplazado. Debes liquidarlo antes de solicitar otro aplazamiento.");
    }

    // Ejecutamos la logica contable (El salto de mes)
    cliente.saldo_aplazado = cliente.saldo_actual;
    cliente.saldo_actual = 0;
    
    // Logica de reactivacion automatica
    if (cliente.estado === "SUSPENDIDO") {
        cliente.estado = "ACTIVO"; // Lo marcamos como activo en la base de datos
        
        // Llamamos a tu script para levantar el servicio en Mikrotik
        if (cliente.usuario_pppoe) {
            const reactivado = await activarClientePPPoE(cliente.usuario_pppoe);
            if (!reactivado) {
                // Solo dejamos un aviso en consola por si falla la conexion al router, 
                // pero no le marcamos error al cliente para no asustarlo.
                console.warn(`[MikroTik] No se pudo reactivar automaticamente al usuario: ${cliente.usuario_pppoe}`);
            }
        }
    }

    await clienteRepo.save(cliente);

    return { 
        message: "Tu pago ha sido aplazado exitosamente. Si tu servicio estaba suspendido, se reactivara en unos instantes.",
        nuevo_saldo_actual: cliente.saldo_actual,
        nuevo_saldo_aplazado: cliente.saldo_aplazado
    };
}

export const crearTicketService = async (cliente_id, datosTicket) => {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    
    const nuevoTicket = ticketRepository.create({
        cliente_id,
        categoria: datosTicket.categoria,
        asunto: datosTicket.asunto,
        descripcion: datosTicket.descripcion
    });

    await ticketRepository.save(nuevoTicket);
    return nuevoTicket;
};

export const getTicketsClienteService = async (cliente_id) => {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    
    // Obtenemos los tickets ordenados por los mas recientes
    const tickets = await ticketRepository.find({
        where: { cliente_id },
        order: { fecha_creacion: "DESC" }
    });

    return tickets;
};

export const getMensajesTicketService = async (cliente_id, ticket_id) => {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    const mensajeRepository = AppDataSource.getRepository(TicketMensaje);

    // 1. Validar que el ticket le pertenezca a este cliente
    const ticket = await ticketRepository.findOne({ where: { id: ticket_id, cliente_id } });
    if (!ticket) throw new Error("Ticket no encontrado o acceso denegado.");

    // 2. Obtener los mensajes ordenados cronologicamente
    const mensajes = await mensajeRepository.find({
        where: { ticket_id },
        order: { fecha_creacion: "ASC" } // Los mas antiguos primero (como un chat)
    });

    return mensajes;
};

// Enviar una respuesta como cliente
export const responderTicketService = async (cliente_id, ticket_id, textoMensaje) => {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    const mensajeRepository = AppDataSource.getRepository(TicketMensaje);

    // 1. Validar propiedad del ticket
    const ticket = await ticketRepository.findOne({ where: { id: ticket_id, cliente_id } });
    if (!ticket) throw new Error("Ticket no encontrado o acceso denegado.");

    // 2. Crear el mensaje
    const nuevoMensaje = mensajeRepository.create({
        ticket_id,
        remitente: "CLIENTE",
        mensaje: textoMensaje
    });

    await mensajeRepository.save(nuevoMensaje);

    // 3. Opcional: Si el ticket estaba "CERRADO", lo reabrimos al estado "ABIERTO" 
    // porque el cliente volvio a comentar.
    if (ticket.estado === "CERRADO") {
        ticket.estado = "ABIERTO";
        await ticketRepository.save(ticket);
    }

    return nuevoMensaje;
};

export const actualizarPerfilService = async (cliente_id, datos) => {
    const clienteRepository = AppDataSource.getRepository(Cliente);
    const cliente = await clienteRepository.findOne({ where: { id: cliente_id } });
    
    if (!cliente) throw new Error("Cliente no encontrado.");

    // Actualizamos solo si se envio el dato
    if (datos.email !== undefined) cliente.email = datos.email;
    if (datos.telefono !== undefined) cliente.telefono = datos.telefono;

    await clienteRepository.save(cliente);
    
    // Devolvemos los datos limpios sin la contrasena
    const { password, ...clienteLimpio } = cliente;
    return clienteLimpio;
};

// Servicio para cambiar la contrasena
export const cambiarPasswordService = async (cliente_id, passwordActual, nuevaPassword) => {
    const clienteRepository = AppDataSource.getRepository(Cliente);
    const cliente = await clienteRepository.findOne({ where: { id: cliente_id } });
    
    if (!cliente) throw new Error("Cliente no encontrado.");

    // 1. Verificar que la contrasena actual sea correcta
    const isMatch = await bcrypt.compare(passwordActual, cliente.password);
    if (!isMatch) throw new Error("La contrasena actual es incorrecta.");

    // 2. Encriptar la nueva contrasena
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

    // 3. Guardar y quitar la bandera de bloqueo forzoso
    cliente.password = hashedPassword;
    cliente.requiere_cambio_password = false;

    await clienteRepository.save(cliente);
    return true;
};