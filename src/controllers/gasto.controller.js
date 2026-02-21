import { AppDataSource } from "../config/data-source.js";
import { Gasto } from "../entities/Gasto.js";
import { Like, Between } from "typeorm";

const gastoRepository = AppDataSource.getRepository(Gasto);

export const obtenerGastos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const categoria = req.query.categoria || "TODOS";
        const search = req.query.search || "";
        
        const skip = (page - 1) * limit;

        let whereConditions = {};
        
        if (categoria !== "TODOS") {
            whereConditions.categoria = categoria;
        }
        
        if (search) {
            whereConditions.concepto = Like(`%${search}%`);
        }

        const [gastos, total] = await gastoRepository.findAndCount({
            where: whereConditions,
            order: { fecha: "DESC" },
            skip: skip,
            take: limit,
            relations: ["usuario"]
        });

        const fechaActual = new Date();
        const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
        const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0, 23, 59, 59);

        const gastosDelMes = await gastoRepository.find({
            where: { fecha: Between(primerDiaMes, ultimoDiaMes) }
        });

        const resumen = {
            totalMes: 0,
            fijo: 0,
            operativo: 0,
            inventario: 0,
            otros: 0
        };

        gastosDelMes.forEach(g => {
            const monto = parseFloat(g.monto);
            resumen.totalMes += monto;
            if (g.categoria === 'Fijo') resumen.fijo += monto;
            else if (g.categoria === 'Operativo') resumen.operativo += monto;
            else if (g.categoria === 'Inventario') resumen.inventario += monto;
            else resumen.otros += monto;
        });

        res.json({
            gastos,
            total,
            resumen
        });

    } catch (error) {
        console.error("Error al obtener gastos:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener gastos" });
    }
};

export const crearGasto = async (req, res) => {
    try {
        const { concepto, monto, categoria } = req.body;
        const usuarioId = req.user?.id; 

        if (!concepto || !monto) {
            return res.status(400).json({ message: "El concepto y el monto son obligatorios" });
        }

        const nuevoGasto = gastoRepository.create({
            concepto,
            monto,
            categoria: categoria || "Otros",
            usuario: usuarioId ? { id: usuarioId } : null
        });

        const resultado = await gastoRepository.save(nuevoGasto);
        res.status(201).json(resultado);
    } catch (error) {
        console.error("Error al crear gasto:", error);
        res.status(500).json({ message: "Error interno al guardar el gasto" });
    }
};

export const eliminarGasto = async (req, res) => {
    try {
        const { id } = req.params;
        const gasto = await gastoRepository.findOneBy({ id: parseInt(id) });

        if (!gasto) {
            return res.status(404).json({ message: "Gasto no encontrado" });
        }

        await gastoRepository.remove(gasto);
        res.json({ message: "Gasto eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar gasto:", error);
        res.status(500).json({ message: "Error interno al eliminar el gasto" });
    }
};