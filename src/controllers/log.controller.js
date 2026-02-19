import { AppDataSource } from "../config/data-source.js";
import { SystemLog } from "../entities/SystemLog.js";

export const getLogs = async (req, res) => {
    try {
        const logRepo = AppDataSource.getRepository(SystemLog);
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [logs, total] = await logRepo.findAndCount({
            order: { fecha: "DESC" },
            take: limit,
            skip: skip
        });

        res.json({
            logs,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los logs" });
    }
};