import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Plan } from "../entity/Plan";

export class PlanController {

    static getAll = async (req: Request, res: Response) => {
        const repo = AppDataSource.getRepository(Plan);
        const plans = await repo.find({ where: { isActive: true } }); // Solo mostramos los activos
        res.json(plans);
    };

    static create = async (req: Request, res: Response) => {
        const { name, price, downloadSpeed, uploadSpeed } = req.body;

        if (!name || !price) {
             res.status(400).json({ message: "Nombre y precio son requeridos" });
             return;
        }

        const repo = AppDataSource.getRepository(Plan);
        
        try {
            const plan = new Plan();
            plan.name = name;
            plan.price = price;
            plan.downloadSpeed = downloadSpeed || 0;
            plan.uploadSpeed = uploadSpeed || 0;
            
            await repo.save(plan);
            res.status(201).json({ message: "Plan creado", plan });
        } catch (error) {
            res.status(500).json({ message: "Error al crear (¿Nombre duplicado?)" });
        }
    };

    static delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const repo = AppDataSource.getRepository(Plan);
        // En lugar de borrar físico, hacemos "Soft Delete" (lo desactivamos)
        // para no romper clientes que ya tengan este plan.
        try {
            const plan = await repo.findOneBy({ id: parseInt(id as string) });
            if (plan) {
                plan.isActive = false;
                await repo.save(plan);
                res.json({ message: "Plan desactivado correctamente" });
            } else {
                res.status(404).json({ message: "Plan no encontrado" });
            }
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar" });
        }
    };
}