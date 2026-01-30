import { AppDataSource } from "../config/data-source.js";
import { Plan } from "../entities/Plan.js";

const planRepo = AppDataSource.getRepository(Plan);

export const getPlanes = async (req, res) => {
    try {
        // Ordenamos por precio para que se vean bonitos en la lista
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

        // Invertimos el estado (Si es true pasa a false, y viceversa)
        plan.activo = !plan.activo;
        await planRepo.save(plan);

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

        // Actualizamos los campos recibidos
        planRepo.merge(plan, req.body);
        
        await planRepo.save(plan);
        res.json(plan);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};