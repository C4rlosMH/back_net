import { AppDataSource } from "../config/data-source.js";
import { SystemLog } from "../entities/SystemLog.js";

export const getLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { accion, usuario, search } = req.query;

        const queryBuilder = AppDataSource.getRepository(SystemLog)
            .createQueryBuilder("log");

        // --- FILTRO POR CATEGORÍA DE ACCIÓN ---
        if (accion && accion !== "TODOS") {
            if (accion === "CREAR") {
                queryBuilder.andWhere("(log.accion LIKE '%CREAR%' OR log.accion LIKE '%REGISTRAR%' OR log.accion LIKE '%NUEVO%')");
            } else if (accion === "EDITAR") {
                queryBuilder.andWhere("(log.accion LIKE '%EDITAR%' OR log.accion LIKE '%ACTUALIZAR%' OR log.accion LIKE '%ESTADO%')");
            } else if (accion === "ELIMINAR") {
                queryBuilder.andWhere("(log.accion LIKE '%ELIMINAR%' OR log.accion LIKE '%BORRAR%')");
            } else if (accion === "PAGOS") {
                queryBuilder.andWhere("(log.accion LIKE '%PAGO%' OR log.accion LIKE '%CARGO%' OR log.accion LIKE '%ABONO%')");
            } else if (accion === "SISTEMA") {
                queryBuilder.andWhere("(log.accion LIKE '%LOGIN%' OR log.accion LIKE '%AUTH%')");
            } else {
                queryBuilder.andWhere("log.accion LIKE :accion", { accion: `%${accion}%` });
            }
        }

        // --- FILTRO POR USUARIO ---
        if (usuario && usuario !== "TODOS") {
            queryBuilder.andWhere("log.usuario = :usuario", { usuario });
        }

        // --- BARRA DE BÚSQUEDA GENERAL ---
        if (search && search.trim() !== "") {
            queryBuilder.andWhere(
                "(log.detalle LIKE :search OR log.accion LIKE :search OR log.usuario LIKE :search)",
                { search: `%${search.trim()}%` }
            );
        }

        queryBuilder.orderBy("log.fecha", "DESC");
        queryBuilder.skip(skip).take(limit);

        const [logs, total] = await queryBuilder.getManyAndCount();

        res.json({
            logs,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error("[Logs] Error al obtener el historial:", error);
        res.status(500).json({ message: "Error al obtener los logs" });
    }
};