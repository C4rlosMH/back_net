// backend/src/controllers/Stats.Controller.ts
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Client } from "../entity/Client";
import { Payment } from "../entity/Payments";
import { Equipment } from "../entity/Equipment";
import { ClientStatus, EquipmentStatus, PaymentType } from "../entity/Enums";
import { Between, LessThan } from "typeorm";

export class StatsController {
    private clientRepo = AppDataSource.getRepository(Client);
    private paymentRepo = AppDataSource.getRepository(Payment);
    private equipmentRepo = AppDataSource.getRepository(Equipment);

    async getDashboardStats(req: Request, res: Response) {
        try {
            // 1. FECHAS PARA EL MES ACTUAL
            const date = new Date();
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            // 2. CONSULTAS PARALELAS (Para que sea rápido)
            const [
                totalClients,
                activeClients,
                debtors, // Clientes con deuda (Balance negativo)
                equipmentsInStock,
                monthlyIncome
            ] = await Promise.all([
                // Total históricos
                this.clientRepo.count(),
                // Clientes Activos
                this.clientRepo.count({ where: { status: ClientStatus.ACTIVO } }),
                // Clientes que deben dinero (balance menor a 0)
                this.clientRepo.count({ where: { balance: LessThan(0) } }),
                // Equipos disponibles
                this.equipmentRepo.count({ where: { status: EquipmentStatus.BODEGA } }),
                // Dinero ingresado este mes (Suma de montos)
                this.paymentRepo.sum("amount", {
                    paymentDate: Between(firstDay, lastDay),
                    // Opcional: Si solo quieres contar pagos reales y no promesas
                    // type: PaymentType.FULL 
                })
            ]);

            return res.json({
                clients: {
                    total: totalClients,
                    active: activeClients,
                    debtors: debtors
                },
                inventory: {
                    inStock: equipmentsInStock
                },
                financial: {
                    monthlyRevenue: monthlyIncome || 0 // Si es null, devuelve 0
                }
            });

        } catch (error) {
            console.error("Error en estadísticas:", error);
            return res.status(500).json({ message: "Error al calcular estadísticas" });
        }
    }
}