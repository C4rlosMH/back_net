import cron from "node-cron";
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { SystemLog } from "../entities/SystemLog.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const logRepo = AppDataSource.getRepository(SystemLog);

export const iniciarCronPenalizacion = () => {
    // Se ejecuta a las 8:30 AM (después de la facturación)
    cron.schedule('30 8 * * *', async () => {
        console.log("CRON [Penalización]: Revisando aplazamientos automáticos (Día 6)...");
        
        try {
            const hoy = new Date();
            const diaActual = hoy.getDate();
            
            let diaObjetivo = diaActual - 6;
            if (diaObjetivo <= 0) {
                const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
                diaObjetivo = ultimoDiaMesAnterior + diaObjetivo;
            }

            const morosos = await clienteRepo.find({
                where: { dia_pago: diaObjetivo }
            });

            let aplazadosCount = 0;

            for (const cliente of morosos) {
                if (Number(cliente.saldo_actual) > 0) {
                    cliente.saldo_aplazado = Number(cliente.saldo_aplazado) + Number(cliente.saldo_actual);
                    cliente.saldo_actual = 0; 
                    cliente.confiabilidad = Math.max(0, (cliente.confiabilidad ?? 100) - 15);
                    
                    await clienteRepo.save(cliente);
                    aplazadosCount++;
                }
            }

            if (aplazadosCount > 0) {
                const log = logRepo.create({
                    usuario: "SISTEMA",
                    accion: "APLAZAMIENTO_AUTOMATICO",
                    detalles: `Se aplazó la deuda y se penalizó a ${aplazadosCount} clientes por agotar sus 5 días de gracia.`
                });
                await logRepo.save(log);
            }

        } catch (error) {
            console.error("Error en la automatización de aplazamientos:", error);
        }
    });
};