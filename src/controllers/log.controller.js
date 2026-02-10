import { AppDataSource } from "../config/data-source.js";
import { SystemLog } from "../entities/SystemLog.js";

const logRepo = AppDataSource.getRepository(SystemLog);

export const getLogs = async (req, res) => {
    try {
        const logs = await logRepo.find({
            order: { fecha: "DESC" },
            take: 200 // Limite de seguridad para no saturar
        });
        res.json(logs);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener logs" });
    }
};