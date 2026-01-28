import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Payment } from "../entity/Payments";
import { Client } from "../entity/Client";
import { PaymentMethod } from "../entity/Enums";
import { Logger } from "../services/Logger"; // <--- [NUEVO] Importar Logger

export class PaymentController {

    static create = async (req: Request, res: Response) => {
        const { clientId, amount, paymentDate, concept, method } = req.body;

        if (!clientId || !amount) {
            res.status(400).json({ message: "Falta Cliente o Monto" });
            return;
        }

        const clientRepo = AppDataSource.getRepository(Client);
        const paymentRepo = AppDataSource.getRepository(Payment);

        const client = await clientRepo.findOneBy({ id: clientId });
        if (!client) {
            res.status(404).json({ message: "Cliente no encontrado" });
            return;
        }

        const payment = new Payment();
        payment.amount = amount;
        payment.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
        payment.concept = concept || "Mensualidad";
        payment.method = method || PaymentMethod.EFECTIVO;
        payment.client = client;

        try {
            await paymentRepo.save(payment);

            // --- [NUEVO] BITÁCORA ---
            // Obtenemos el ID del usuario desde el token (gracias al middleware checkJwt)
            const userId = res.locals.jwtPayload.userId; 
            await Logger.log(
                userId, 
                "COBRAR", 
                "PAGOS", 
                `Cobro de $${amount} a cliente #${client.name} (${payment.method})`
            );
            // ------------------------

            res.status(201).json({ message: "Pago registrado exitosamente", payment });
        } catch (error) {
            res.status(500).json({ message: "Error al registrar el pago" });
        }
    };

    static getByClient = async (req: Request, res: Response) => {
        const { clientId } = req.params;
        const paymentRepo = AppDataSource.getRepository(Payment);

        try {
            const payments = await paymentRepo.find({
                where: { client: { id: parseInt(clientId as string) } },
                order: { paymentDate: "DESC" }
            });
            res.json(payments);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener historial" });
        }
    };
}