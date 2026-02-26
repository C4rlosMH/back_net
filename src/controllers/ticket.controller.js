import { AppDataSource } from "../config/data-source.js";
import { Ticket } from "../entities/Ticket.js";
import { TicketMensaje } from "../entities/TicketMensaje.js";
import { registrarLog } from "../services/log.service.js";

const ticketRepo = AppDataSource.getRepository(Ticket);
const mensajeRepo = AppDataSource.getRepository(TicketMensaje);

// 1. Obtener TODOS los tickets
export const getTickets = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { estado, categoria, search } = req.query;

        const kpis = {
            abiertos: await ticketRepo.count({ where: { estado: "ABIERTO" } }),
            en_progreso: await ticketRepo.count({ where: { estado: "EN_PROGRESO" } }),
            esperando: await ticketRepo.count({ where: { estado: "ESPERANDO" } })
        };

        const queryBuilder = ticketRepo.createQueryBuilder("ticket")
            .leftJoinAndSelect("ticket.cliente", "cliente")
            .leftJoinAndSelect("ticket.responsable", "responsable"); // Traemos al responsable

        if (estado && estado !== "TODOS") {
            queryBuilder.andWhere("ticket.estado = :estado", { estado });
        }
        
        if (categoria && categoria !== "TODAS") {
            queryBuilder.andWhere("ticket.categoria = :categoria", { categoria });
        }

        if (search && search.trim() !== "") {
            queryBuilder.andWhere(
                "(ticket.asunto LIKE :search OR cliente.nombre_completo LIKE :search OR ticket.id LIKE :searchExact)",
                { search: `%${search.trim()}%`, searchExact: search.trim() }
            );
        }

        queryBuilder.orderBy("ticket.estado", "ASC")
                    .addOrderBy("ticket.fecha_creacion", "DESC");
        
        queryBuilder.skip(skip).take(limit);

        const [tickets, total] = await queryBuilder.getManyAndCount();

        const ticketsConNotificacion = await Promise.all(tickets.map(async (ticket) => {
            const ultimoMensaje = await mensajeRepo.findOne({
                where: { ticket: { id: ticket.id } },
                order: { fecha_creacion: "DESC" }
            });

            return {
                ...ticket,
                tiene_mensajes_nuevos: ultimoMensaje ? ultimoMensaje.remitente === "CLIENTE" : false
            };
        }));

        res.json({
            tickets: ticketsConNotificacion,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            kpis
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 2. Obtener mensajes
export const getTicketMensajes = async (req, res) => {
    try {
        const { id } = req.params;
        const mensajes = await mensajeRepo.find({
            where: { ticket: { id: parseInt(id) } },
            order: { fecha_creacion: "ASC" }
        });
        res.json(mensajes);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 3. Responder ticket
export const responderTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { mensaje } = req.body;

        const ticket = await ticketRepo.findOneBy({ id: parseInt(id) });
        if (!ticket) return res.status(404).json({ message: "Ticket no encontrado" });

        const nuevoMensaje = mensajeRepo.create({
            ticket: { id: ticket.id },
            remitente: "ADMIN", 
            mensaje: mensaje
        });

        await mensajeRepo.save(nuevoMensaje);

        if (ticket.estado === "ABIERTO" || ticket.estado === "ESPERANDO") {
            ticket.estado = "EN_PROGRESO";
            await ticketRepo.save(ticket);
        }

        res.json(nuevoMensaje);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 4. Cambiar estado y guardar solución opcional
export const updateEstadoTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, solucion } = req.body;

        const ticket = await ticketRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["cliente"]
        });

        if (!ticket) return res.status(404).json({ message: "Ticket no encontrado" });

        ticket.estado = estado;
        if (estado === "CERRADO" && solucion) {
            ticket.solucion = solucion;
        }

        await ticketRepo.save(ticket);

        registrarLog(
            req.user?.username || "Sistema",
            "ESTADO_TICKET",
            `El ticket #${ticket.id} cambio a estado ${estado}`,
            "Ticket",
            ticket.id
        );

        res.json(ticket);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 5. Asignarse un ticket
export const asignarTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.user.id; 

        const ticket = await ticketRepo.findOne({ 
            where: { id: parseInt(id) },
            relations: ["cliente"]
        });

        if (!ticket) return res.status(404).json({ message: "Ticket no encontrado" });

        ticket.responsable_id = usuario_id;
        await ticketRepo.save(ticket);

        registrarLog(
            req.user?.username || "Sistema",
            "ASIGNAR_TICKET",
            `El usuario se asigno el ticket #${ticket.id} del cliente ${ticket.cliente?.nombre_completo || 'Desconocido'}`,
            "Ticket",
            ticket.id
        );

        const ticketActualizado = await ticketRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["cliente", "responsable"]
        });

        res.json(ticketActualizado);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 6. Eliminar ticket
export const deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const ticket = await ticketRepo.findOne({ 
            where: { id: parseInt(id) }, 
            relations: ["cliente"] 
        });

        if (!ticket) return res.status(404).json({ message: "Ticket no encontrado" });

        await mensajeRepo.delete({ ticket: { id: parseInt(id) } });
        await ticketRepo.delete({ id: parseInt(id) });

        registrarLog(
            req.user?.username || "Administrador",
            "ELIMINAR_TICKET",
            `Se elimino el ticket #${id} (${ticket.asunto})`,
            "Ticket",
            parseInt(id)
        );

        return res.sendStatus(204);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const calificarTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { calificacion, comentario } = req.body;

        const ticket = await ticketRepo.findOneBy({ id: parseInt(id) });
        if (!ticket) return res.status(404).json({ message: "Ticket no encontrado" });

        if (ticket.estado !== "CERRADO") {
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

export const getMetricasSoporte = async (req, res) => {
    try {
        // 1. Distribución de tickets por categoría
        const categorias = await ticketRepo.createQueryBuilder("ticket")
            .select("ticket.categoria", "categoria")
            .addSelect("COUNT(ticket.id)", "total")
            .groupBy("ticket.categoria")
            .orderBy("total", "DESC")
            .getRawMany();

        // 2. Rendimiento por técnico
        const rendimiento = await ticketRepo.createQueryBuilder("ticket")
            .leftJoin("ticket.responsable", "responsable")
            .select("responsable.nombre", "tecnico")
            .addSelect("COUNT(ticket.id)", "tickets_resueltos")
            .addSelect("AVG(ticket.calificacion)", "promedio_calificacion")
            .where("ticket.estado = :estado", { estado: "CERRADO" })
            .andWhere("ticket.responsable_id IS NOT NULL")
            .groupBy("ticket.responsable_id")
            .orderBy("tickets_resueltos", "DESC")
            .getRawMany();

        const rendimientoFormateado = rendimiento.map(item => ({
            tecnico: item.tecnico,
            tickets_resueltos: parseInt(item.tickets_resueltos),
            promedio_calificacion: item.promedio_calificacion ? parseFloat(item.promedio_calificacion).toFixed(1) : "Sin calificar"
        }));

        // 3. MTTR (Tiempo Promedio de Resolución)
        // Calculamos la diferencia de tiempo entre la creación y el cierre de los tickets CERRADOS
        const ticketsCerrados = await ticketRepo.find({
            where: { estado: "CERRADO" },
            select: ["fecha_creacion", "fecha_actualizacion"]
        });

        let mttr_horas = 0;
        let mttr_texto = "Sin datos";

        if (ticketsCerrados.length > 0) {
            const totalMilisegundos = ticketsCerrados.reduce((acc, ticket) => {
                const diff = new Date(ticket.fecha_actualizacion) - new Date(ticket.fecha_creacion);
                return acc + diff;
            }, 0);

            const promedioMs = totalMilisegundos / ticketsCerrados.length;
            mttr_horas = promedioMs / (1000 * 60 * 60); // Convertir a horas
            
            if (mttr_horas < 1) {
                mttr_texto = `${Math.round(mttr_horas * 60)} minutos`;
            } else {
                mttr_texto = `${mttr_horas.toFixed(1)} horas`;
            }
        }

        // 4. Carga de trabajo reciente (Últimos 7 días)
        const fechaHace7Dias = new Date();
        fechaHace7Dias.setDate(fechaHace7Dias.getDate() - 7);

        const cargaReciente = await ticketRepo.createQueryBuilder("ticket")
            .where("ticket.fecha_creacion >= :fecha", { fecha: fechaHace7Dias })
            .getCount();

        res.json({
            categorias,
            rendimiento: rendimientoFormateado,
            kpis_extra: {
                tiempo_promedio_resolucion: mttr_texto,
                carga_ultimos_7_dias: cargaReciente
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 8. KPIs rápidos para el Dashboard Principal (Solo Pendientes y Críticos)
export const getDashboardKpisTickets = async (req, res) => {
    try {
        // 1. Nuevos (Abiertos)
        const abiertos = await ticketRepo.count({ where: { estado: "ABIERTO" } });

        // 2. Emergencias (Prioridad ALTA y que no estén cerrados)
        const criticos = await ticketRepo.createQueryBuilder("ticket")
            .where("ticket.prioridad = :prioridad", { prioridad: "ALTA" })
            .andWhere("ticket.estado != :estadoCerrado", { estadoCerrado: "CERRADO" })
            .andWhere("ticket.estado != :estadoResuelto", { estadoResuelto: "RESUELTO" })
            .getCount();

        res.json({
            abiertos,
            criticos
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};