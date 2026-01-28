import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Client } from "../entity/Client";
import { Plan } from "../entity/Plan";

export class ClientController {

    // --- 1. OBTENER TODOS ---
    static getAll = async (req: Request, res: Response) => {
        const clientRepo = AppDataSource.getRepository(Client);
        try {
            const clients = await clientRepo.find({
                order: { id: "ASC" } // Ordenados por ID
            });
            res.json(clients);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener clientes" });
        }
    };

    // --- 2. CREAR ---
    static create = async (req: Request, res: Response) => {
        const { name, address, phone, coordinates, planId } = req.body;
        
        if (!name || !address) {
             res.status(400).json({ message: "Nombre y dirección son obligatorios" });
             return;
        }

        const clientRepo = AppDataSource.getRepository(Client);
        const client = new Client();
        client.name = name;
        client.address = address;
        client.phone = phone;
        client.coordinates = coordinates;
        // El status se pone en ACTIVO por defecto en la Entidad

        if (planId) {
            const planRepo = AppDataSource.getRepository(Plan);
            const plan = await planRepo.findOneBy({ id: planId });
            if (plan) {
                client.plan = plan;
            }
        }

        try {
            await clientRepo.save(client);
            res.status(201).json({ message: "Cliente creado", client });
        } catch (error) {
            res.status(500).json({ message: "Error al crear cliente" });
        }
    };

    // --- 3. OBTENER UNO POR ID (Nuevo) ---
    static getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const clientRepo = AppDataSource.getRepository(Client);
        
        try {
            const client = await clientRepo.findOne({
                where: { id: parseInt(id as string) },
                relations: ["equipments"] // <--- ¡Magia! Trae sus equipos automáticamente
            });

            if (!client) {
                res.status(404).json({ message: "Cliente no encontrado" });
                return;
            }
            res.json(client);
        } catch (error) {
            res.status(500).json({ message: "Error al buscar cliente" });
        }
    };

    // --- 4. ACTUALIZAR (Nuevo) ---
    static update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name, address, phone, coordinates, status } = req.body;
        const clientRepo = AppDataSource.getRepository(Client);

        try {
            let client = await clientRepo.findOneBy({ id: parseInt(id as string) });

            if (!client) {
                res.status(404).json({ message: "Cliente no encontrado" });
                return;
            }

            // Actualizamos solo lo que envíen
            client.name = name || client.name;
            client.address = address || client.address;
            client.phone = phone || client.phone;
            client.coordinates = coordinates || client.coordinates;
            client.status = status || client.status; // Para cambiar a SUSPENDIDO o RETIRADO

            await clientRepo.save(client);
            res.json({ message: "Cliente actualizado", client });
        } catch (error) {
            res.status(500).json({ message: "Error al actualizar cliente" });
        }
    };

    // --- 5. ELIMINAR (Nuevo) ---
    static delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const clientRepo = AppDataSource.getRepository(Client);

        try {
            const result = await clientRepo.delete(id);

            if (result.affected === 0) {
                res.status(404).json({ message: "Cliente no encontrado" });
                return;
            }
            
            res.json({ message: "Cliente eliminado correctamente" });
        } catch (error) {
            // Si el cliente tiene equipos, la BD no dejará borrarlo (Integridad Referencial)
            res.status(500).json({ message: "No se puede eliminar: el cliente tiene equipos asignados o hubo un error." });
        }
    };
}