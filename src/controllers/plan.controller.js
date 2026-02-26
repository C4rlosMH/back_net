import { AppDataSource } from "../config/data-source.js";
import { Plan } from "../entities/Plan.js";
import { registrarLog } from "../services/log.service.js"; // <--- Importación
import { Cliente } from "../entities/Cliente.js";

const planRepo = AppDataSource.getRepository(Plan);
const clienteRepo = AppDataSource.getRepository(Cliente);

export const getPlanes = async (req, res) => {
    try {
        const planes = await planRepo.find({ order: { precio_mensual: "ASC" } });
        res.json(planes);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createPlan = async (req, res) => {
    try {
        const { nombre, precio_mensual, velocidad_mb, visible_web } = req.body;
        
        const plan = planRepo.create({
            nombre,
            precio_mensual: parseFloat(precio_mensual),
            velocidad_mb: parseInt(velocidad_mb),
            activo: true,
            visible_web: visible_web !== undefined ? visible_web : true // Agregado aquí
        });

        await planRepo.save(plan);

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username,
            "CREAR_PLAN",
            `Se creo el plan de internet: ${nombre} (${velocidad_mb} Mbps por $${precio_mensual})`,
            "Plan",
            plan.id
        );

        res.json(plan);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const togglePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await planRepo.findOneBy({ id: parseInt(id) });

        if (!plan) return res.status(404).json({ message: "Plan no encontrado" });

        plan.activo = !plan.activo;
        await planRepo.save(plan);

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username,
            "ESTADO_PLAN",
            `Se marco el plan "${plan.nombre}" como ${plan.activo ? 'ACTIVO' : 'INACTIVO'}`,
            "Plan",
            plan.id
        );

        res.json(plan);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await planRepo.findOneBy({ id: parseInt(id) });

        if (!plan) return res.status(404).json({ message: "Plan no encontrado" });

        planRepo.merge(plan, req.body);
        await planRepo.save(plan);

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username,
            "ACTUALIZAR_PLAN",
            `Se modificaron los detalles del plan: ${plan.nombre}`,
            "Plan",
            plan.id
        );

        res.json(plan);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getPlanesWeb = async (req, res) => {
    try {
        const planes = await planRepo
            .createQueryBuilder("plan")
            .where("plan.activo = :activo", { activo: true })
            .andWhere("plan.visible_web = :visible_web", { visible_web: true })
            // Esta función "mapea" dinámicamente cuántos clientes en estado ACTIVO tienen este plan
            .loadRelationCountAndMap(
                "plan.cantidad_clientes", 
                "plan.clientes", 
                "cliente", 
                (qb) => qb.where("cliente.estado = :estado", { estado: "ACTIVO" })
            )
            .orderBy("plan.precio_mensual", "ASC")
            .getMany();

        res.json(planes);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- NUEVO: Endpoint para estadísticas públicas (Clientes Totales) ---
export const getPublicStats = async (req, res) => {
    try {
        // Cuenta exactamente cuántos clientes en la BD tienen estado 'ACTIVO'
        const clientesActivos = await clienteRepo.count({
            where: { estado: "ACTIVO" }
        });

        res.json({ clientesActivos });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const toggleWebPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await planRepo.findOneBy({ id: parseInt(id) });

        if (!plan) return res.status(404).json({ message: "Plan no encontrado" });

        plan.visible_web = !plan.visible_web;
        await planRepo.save(plan);

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username,
            "VISIBILIDAD_PLAN",
            `Se cambio la visibilidad web del plan "${plan.nombre}" a ${plan.visible_web ? 'VISIBLE' : 'OCULTO'}`,
            "Plan",
            plan.id
        );

        res.json(plan);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};