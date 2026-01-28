// src/controllers/Payment.Controller.ts
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Payment } from "../entity/Payments";
import { Client } from "../entity/Client";
import { PaymentType } from "../entity/Enums";

export class PaymentController {
    private paymentRepository = AppDataSource.getRepository(Payment);
    private clientRepository = AppDataSource.getRepository(Client);

    // Método para crear el pago (ya lo teníamos)
    async create(req: Request, res: Response) {
        try {
            const { clientId, amount, paymentDate, concept, method, type } = req.body;

            const client = await this.clientRepository.findOne({
                where: { id: clientId },
                relations: ["plan"]
            });

            if (!client) return res.status(404).json({ message: "Cliente no encontrado" });

            const planPrice = client.plan ? Number(client.plan.price) : 0;
            const receivedAmount = Number(amount);
            
            let finalAmount = receivedAmount;
            if (type === PaymentType.DEFERRED) finalAmount = 0;
            else if (type === PaymentType.FULL) finalAmount = planPrice;

            const balanceAdjustment = finalAmount - planPrice;
            client.balance = Number(client.balance) + balanceAdjustment;

            const newPayment = this.paymentRepository.create({
                amount: finalAmount,
                paymentDate: paymentDate || new Date(),
                concept: concept || `Mensualidad - ${new Date().toLocaleString('es-MX', { month: 'long' })}`,
                method,
                type,
                client
            });

            await AppDataSource.transaction(async (manager) => {
                await manager.save(newPayment);
                await manager.save(client);
            });

            return res.status(201).json(newPayment);
        } catch (error) {
            return res.status(500).json({ message: "Error al crear pago" });
        }
    }

    // --- EL MÉTODO QUE FALTABA ---
    async getByClient(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const payments = await this.paymentRepository.find({
                where: { client: { id: Number(clientId) } },
                order: { paymentDate: "DESC" }
            });
            return res.json(payments);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener historial" });
        }
    }

    async getAll(req: Request, res: Response) {
        const payments = await this.paymentRepository.find({
            relations: ["client"],
            order: { createdAt: "DESC" }
        });
        return res.json(payments);
    }
}