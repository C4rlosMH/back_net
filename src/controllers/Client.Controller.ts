import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Client } from "../entity/Client";
import { Equipment } from "../entity/Equipment";
import { Plan } from "../entity/Plan";
import { EquipmentStatus } from "../entity/Enums";

export class ClientController {
    private clientRepository = AppDataSource.getRepository(Client);
    private equipmentRepository = AppDataSource.getRepository(Equipment);
    private planRepository = AppDataSource.getRepository(Plan);

    async getAll(req: Request, res: Response) {
        try {
            // Traemos las relaciones para que el frontend pueda mostrar el nombre del plan y el S/N del equipo
            const clients = await this.clientRepository.find({
                relations: ["plan", "equipments"],
                order: { id: "DESC" }
            });
            return res.json(clients);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener clientes" });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { name, address, phone, cutOffDay, planId, equipmentId } = req.body;

            // 1. Validaciones iniciales
            if (!planId) return res.status(400).json({ message: "El plan es obligatorio" });

            const plan = await this.planRepository.findOneBy({ id: planId });
            if (!plan) return res.status(404).json({ message: "Plan no encontrado" });

            // 2. Iniciamos Transacción para asegurar la integridad
            const result = await AppDataSource.transaction(async (transactionalEntityManager) => {
                
                // Crear y guardar el cliente
                const newClient = new Client();
                newClient.name = name;
                newClient.address = address;
                newClient.phone = phone;
                newClient.cutOffDay = cutOffDay || 30;
                newClient.plan = plan;
                newClient.balance = 0;

                const savedClient = await transactionalEntityManager.save(newClient);

                // 3. Si se seleccionó un equipo, lo vinculamos
                if (equipmentId) {
                    const equipment = await this.equipmentRepository.findOneBy({ id: equipmentId });
                    
                    if (equipment) {
                        // Verificamos si el equipo no está ya ocupado (opcional pero recomendado)
                        equipment.client = savedClient;
                        equipment.status = EquipmentStatus.INSTALADO;
                        await transactionalEntityManager.save(equipment);
                    }
                }

                return savedClient;
            });

            return res.status(201).json(result);

        } catch (error) {
            console.error("Error en Create Client:", error);
            return res.status(500).json({ message: "Error interno al crear cliente" });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const client = await this.clientRepository.findOne({
                where: { id: Number(id) },
                relations: ["equipments"]
            });

            if (!client) return res.status(404).json({ message: "Cliente no encontrado" });

            // Antes de borrar, liberamos los equipos (vuelven a bodega)
            await AppDataSource.transaction(async (manager) => {
                if (client.equipments && client.equipments.length > 0) {
                    for (const eq of client.equipments) {
                        eq.status = EquipmentStatus.BODEGA;
                        eq.client = null as any;
                        await manager.save(eq);
                    }
                }
                await manager.remove(client);
            });

            return res.json({ message: "Cliente eliminado y equipos devueltos a bodega" });
        } catch (error) {
            return res.status(500).json({ message: "Error al eliminar cliente" });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            await this.clientRepository.update(id, updateData);
            const updatedClient = await this.clientRepository.findOneBy({ id: Number(id) });
            
            return res.json(updatedClient);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar cliente" });
        }
    }
    async getOne(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const client = await this.clientRepository.findOne({
                where: { id: Number(id) },
                relations: ["plan", "equipments", "payments"], // <--- Traemos todo
                order: {
                    payments: {
                        paymentDate: "DESC" // Los pagos más recientes primero
                    }
                }
            });

            if (!client) return res.status(404).json({ message: "Cliente no encontrado" });

            return res.json(client);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener detalles del cliente" });
        }
    }
}