// src/controllers/SystemLog.Controller.ts
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { SystemLog } from "../entity/SystemLog";

export class SystemLogController {
    static getRecent = async (req: Request, res: Response) => {
        const repo = AppDataSource.getRepository(SystemLog);
        const logs = await repo.find({
            order: { createdAt: "DESC" },
            take: 50, // Solo los últimos 50 eventos (Eficiencia)
            relations: ["user"] // Para ver el nombre del usuario
        });
        res.json(logs);
    };
}