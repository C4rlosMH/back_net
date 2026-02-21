import { AppDataSource } from "../config/data-source.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { 
    generarCargoMensualService, 
    registrarPagoService, 
    getHistorialPagosService
} from "../services/pago.service.js";
import { registrarLog } from "../services/log.service.js";

export const generarCargo = async (req, res) => {
    try {
        const { clienteId } = req.body;
        const resultado = await generarCargoMensualService(clienteId);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Sistema",
            "GENERAR_CARGO",
            `Se genero un cargo mensual para el cliente ID: ${clienteId}`,
            "MovimientoFinanciero",
            resultado.id
        );

        res.json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const registrarPago = async (req, res) => {
    try {
        const resultado = await registrarPagoService(req.body);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "REGISTRAR_PAGO",
            `Se registro un pago/abono de $${req.body.monto} al cliente ID: ${req.body.clienteId} (${req.body.tipo_pago})`,
            "MovimientoFinanciero",
            resultado.id
        );

        res.json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getHistorial = async (req, res) => {
    try {
        const { id } = req.params;
        const historial = await getHistorialPagosService(id);
        res.json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- PAGINACION, FILTROS Y BUSQUEDA IMPLEMENTADOS ---
export const getPagosGlobales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const { tipo, metodo, search } = req.query;

        const queryBuilder = AppDataSource.getRepository(MovimientoFinanciero)
            .createQueryBuilder("movimiento")
            .leftJoinAndSelect("movimiento.cliente", "cliente");

        // Aplicar Filtros Select
        if (tipo && tipo !== "TODOS") {
            queryBuilder.andWhere("movimiento.tipo = :tipo", { tipo });
        }

        if (metodo && metodo !== "TODOS") {
            queryBuilder.andWhere("movimiento.metodo_pago = :metodo", { metodo });
        }

        // Aplicar Barra de Busqueda (Busca en Nombre, Descripcion o Referencia)
        if (search && search.trim() !== "") {
            queryBuilder.andWhere(
                "(cliente.nombre_completo LIKE :search OR movimiento.descripcion LIKE :search OR movimiento.referencia LIKE :search)",
                { search: `%${search.trim()}%` }
            );
        }

        queryBuilder.orderBy("movimiento.fecha", "DESC");
        queryBuilder.skip(skip).take(limit);

        const [movimientos, total] = await queryBuilder.getManyAndCount();

        // --- CALCULAR INGRESOS DE HOY (Desde la BD para que sea exacto) ---
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { sum } = await AppDataSource.getRepository(MovimientoFinanciero)
            .createQueryBuilder("movimiento")
            .select("SUM(movimiento.monto)", "sum")
            .where("movimiento.tipo = :tipoAbono", { tipoAbono: "ABONO" })
            .andWhere("movimiento.fecha >= :start", { start: startOfDay })
            .andWhere("movimiento.fecha <= :end", { end: endOfDay })
            .getRawOne();

        const ingresosHoy = Number(sum || 0);

        res.json({
            movimientos,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            ingresosHoy // Se envia el calculo real al frontend
        });
    } catch (error) {
        console.error("Error al obtener pagos globales:", error);
        res.status(500).json({ message: "Error al obtener el historial de pagos" });
    }
};