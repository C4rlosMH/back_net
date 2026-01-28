import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Equipment } from "../entity/Equipment";
import { Client } from "../entity/Client";

export class EquipmentController {

    // --- 1. OBTENER TODOS ---
    static getAll = async (req: Request, res: Response) => {
        const repo = AppDataSource.getRepository(Equipment);
        try {
            const equipments = await repo.find({
                relations: ["client"], // Muestra a quién pertenece
                order: { id: "ASC" }
            });
            res.json(equipments);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener equipos" });
        }
    };

    // --- 2. CREAR ---
    static create = async (req: Request, res: Response) => {
        const { type, sn, mac, adminPass, clientId, ...otrosDatos } = req.body;

        if (!type || !sn || !mac || !adminPass) {
             res.status(400).json({ message: "Faltan datos (Type, SN, MAC, AdminPass)" });
             return;
        }

        const repo = AppDataSource.getRepository(Equipment);
        
        // Verificar duplicados antes de guardar (Opcional pero recomendado)
        const exists = await repo.findOneBy({ sn }); 
        if (exists) {
             res.status(409).json({ message: "Ya existe un equipo con ese Número de Serie (SN)" });
             return;
        }

        const equipment = new Equipment();
        equipment.type = type;
        equipment.sn = sn;
        equipment.mac = mac;
        equipment.adminPass = adminPass;
        Object.assign(equipment, otrosDatos);

        if (clientId) {
            const clientRepo = AppDataSource.getRepository(Client);
            const client = await clientRepo.findOneBy({ id: clientId });
            if (client) {
                equipment.client = client;
            } else {
                 res.status(404).json({ message: "El cliente especificado no existe" });
                 return;
            }
        }

        try {
            await repo.save(equipment);
            res.status(201).json({ message: "Equipo registrado", equipment });
        } catch (error) {
            res.status(500).json({ message: "Error al guardar equipo" });
        }
    };

    // --- 3. OBTENER UNO POR ID (Nuevo) ---
    static getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const repo = AppDataSource.getRepository(Equipment);
        
        try {
            const equipment = await repo.findOne({
                where: { id: parseInt(id as string) },
                relations: ["client"] // Incluye datos del cliente
            });

            if (!equipment) {
                res.status(404).json({ message: "Equipo no encontrado" });
                return;
            }
            res.json(equipment);
        } catch (error) {
            res.status(500).json({ message: "Error al buscar equipo" });
        }
    };

    // --- 4. ACTUALIZAR (Nuevo) ---
    static update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { clientId, ...data } = req.body; // Separamos clientId del resto de datos
        const repo = AppDataSource.getRepository(Equipment);

        try {
            const equipment = await repo.findOneBy({ id: parseInt(id as string) });
            if (!equipment) {
                res.status(404).json({ message: "Equipo no encontrado" });
                return;
            }

            // Actualizamos los datos simples (marca, modelo, wifi, etc.)
            repo.merge(equipment, data);

            // Si envían un clientId, actualizamos la relación (Cambio de dueño)
            if (clientId) {
                const clientRepo = AppDataSource.getRepository(Client);
                const client = await clientRepo.findOneBy({ id: clientId });
                if (!client) {
                    res.status(404).json({ message: "El cliente nuevo no existe" });
                    return;
                }
                equipment.client = client;
            }

            const result = await repo.save(equipment);
            res.json({ message: "Equipo actualizado", equipment: result });
        } catch (error) {
            res.status(500).json({ message: "Error al actualizar (¿MAC o SN duplicado?)" });
        }
    };

    // --- 5. ELIMINAR (Nuevo) ---
    static delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const repo = AppDataSource.getRepository(Equipment);

        try {
            const result = await repo.delete(id);

            if (result.affected === 0) {
                res.status(404).json({ message: "Equipo no encontrado" });
                return;
            }
            
            res.json({ message: "Equipo eliminado correctamente" });
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar equipo" });
        }
    };
}