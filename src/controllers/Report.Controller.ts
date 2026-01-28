import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Client } from "../entity/Client";
import { Payment } from "../entity/Payments";
import { Equipment } from "../entity/Equipment";
import { Between } from "typeorm";
import { ClientStatus } from "../entity/Enums"; // Asegúrate de tener este enum

export class ReportController {

    // 1. DASHBOARD PRINCIPAL (Resumen Rápido)
    static getDashboardStats = async (req: Request, res: Response) => {
        const clientRepo = AppDataSource.getRepository(Client);
        const paymentRepo = AppDataSource.getRepository(Payment);
        const equipmentRepo = AppDataSource.getRepository(Equipment);

        try {
            // Contamos clientes por estado
            const totalClients = await clientRepo.count();
            const activeClients = await clientRepo.count({ where: { status: ClientStatus.ACTIVO } });
            const suspendedClients = await clientRepo.count({ where: { status: ClientStatus.SUSPENDIDO } });

            // Contamos equipos en inventario vs instalados
            const totalEquipments = await equipmentRepo.count();
            // Suponiendo que si tiene 'client' asignado, está instalado
            const installedEquipments = await equipmentRepo.count({ 
                where: { client: { id: undefined } } // Esto cuenta los que NO tienen cliente (en Bodega)
                // Nota: La lógica inversa depende de cómo guardes null. 
                // Mejor usamos una query builder abajo para ser más precisos o el Enum de estado.
            });

            // Ingresos del Mes Actual
            const date = new Date();
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const paymentsThisMonth = await paymentRepo.find({
                where: {
                    paymentDate: Between(firstDay, lastDay)
                }
            });

            // Sumar el dinero (reduce es como un sumatorio en Excel)
            const incomeThisMonth = paymentsThisMonth.reduce((sum, pay) => sum + Number(pay.amount), 0);

            res.json({
                clients: {
                    total: totalClients,
                    active: activeClients,
                    suspended: suspendedClients
                },
                inventory: {
                    total: totalEquipments,
                    // Si tienes un enum de estado de equipo, úsalo aquí
                },
                finance: {
                    incomeThisMonth: incomeThisMonth.toFixed(2),
                    transactionsCount: paymentsThisMonth.length
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al generar reporte dashboard" });
        }
    };

    // 2. REPORTE DE INGRESOS POR FECHA (Corte de Caja)
    // Permite buscar: "¿Cuánto gané del 1 al 15 de Enero?"
    static getIncomeReport = async (req: Request, res: Response) => {
        const { startDate, endDate } = req.body; // Esperamos formato YYYY-MM-DD
        const paymentRepo = AppDataSource.getRepository(Payment);

        if (!startDate || !endDate) {
            res.status(400).json({ message: "Se requieren fechas de inicio y fin" });
            return;
        }

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59); // Para incluir todo el día final

            const payments = await paymentRepo.find({
                where: {
                    paymentDate: Between(start, end)
                },
                relations: ["client"], // Para saber quién pagó
                order: { paymentDate: "DESC" }
            });

            const total = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);

            res.json({
                range: { startDate, endDate },
                totalIncome: total.toFixed(2),
                details: payments // Lista detallada de cada pago
            });

        } catch (error) {
            res.status(500).json({ message: "Error al generar reporte de ingresos" });
        }
    };
}