import { AppDataSource } from "../config/data-source.js";
import { Plan } from "../entities/Plan.js";
import { registrarLog } from "../services/log.service.js"; // <--- Importación

const planRepo = AppDataSource.getRepository(Plan);

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
        const { nombre, precio_mensual, velocidad_mb } = req.body;
        
        const plan = planRepo.create({
            nombre,
            precio_mensual: parseFloat(precio_mensual),
            velocidad_mb: parseInt(velocidad_mb),
            activo: true
        });

        await planRepo.save(plan);

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
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
            req.user?.username || "Administrador",
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
            req.user?.username || "Administrador",
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