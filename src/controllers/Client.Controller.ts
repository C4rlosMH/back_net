import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Client } from "../entity/Client";
import { Plan } from "../entity/Plan";
import { Logger } from "../services/Logger";

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
        const { name, address, phone, coordinates, status, planId } = req.body;
        const clientRepo = AppDataSource.getRepository(Client);

        try {
            let client = await clientRepo.findOne({
                where: { id: parseInt(id as string) },
                relations: ["plan"] // Traemos el plan actual para comparar
            });

            if (!client) {
                res.status(404).json({ message: "Cliente no encontrado" });
                return;
            }

            // Datos básicos
            client.name = name || client.name;
            client.address = address || client.address;
            client.phone = phone || client.phone;
            client.coordinates = coordinates || client.coordinates;
            client.status = status || client.status;

            // --- LÓGICA DE PLAN CON LOG ---
            if (planId) {
                const planRepo = AppDataSource.getRepository(Plan);
                const newPlan = await planRepo.findOneBy({ id: planId });
                
                if (newPlan) {
                    const planAnterior = client.plan ? client.plan.name : "Sin Plan";
                    client.plan = newPlan;

                    // [NUEVO] Solo guardamos log si el plan realmente cambió
                    if (planAnterior !== newPlan.name) {
                        const userId = res.locals.jwtPayload.userId;
                        await Logger.log(
                            userId,
                            "EDITAR",
                            "CLIENTES",
                            `Cliente #${id} cambió de plan: ${planAnterior} -> ${newPlan.name}`
                        );
                    }
                }
            }

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
            // 1. Primero buscamos al cliente para saber CÓMO se llama antes de borrarlo
            const client = await clientRepo.findOneBy({ id: parseInt(id as string) });

            if (!client) {
                res.status(404).json({ message: "Cliente no encontrado" });
                return;
            }

            // 2. Intentamos borrarlo
            await clientRepo.remove(client);

            // 3. SI SE BORRÓ CON ÉXITO -> Guardamos el Log
            // Aquí respondemos tus dos preguntas:
            // ¿Quién fue? -> userId (obtenido del token)
            // ¿A quién eliminó? -> client.name (guardado en la variable antes de borrar)
            
            const userId = res.locals.jwtPayload.userId;
            
            await Logger.log(
                userId,
                "ELIMINAR",
                "CLIENTES",
                `Eliminó permanentemente al cliente: ${client.name} (ID: ${id})`
            );
            
            res.json({ message: "Cliente eliminado correctamente" });

        } catch (error) {
            // Si falla (ej. tiene pagos o equipos), no se guarda el log porque no se borró
            res.status(500).json({ 
                message: "No se puede eliminar: El cliente tiene equipos o pagos registrados." 
            });
        }
    };
}