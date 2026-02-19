import cron from "node-cron";
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { SystemLog } from "../entities/SystemLog.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const logRepo = AppDataSource.getRepository(SystemLog);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

export const iniciarCronSuspension = () => {
    // Se ejecuta a las 10:00 AM
    cron.schedule('0 10 * * *', async () => {
        console.log("CRON [Suspensión]: Revisando clientes para cortes estrictos...");
        
        try {
            const clientesActivos = await clienteRepo.find({
                where: { estado: "ACTIVO" },
                relations: ["plan"]
            });

            let suspendidosCount = 0;

            for (const cliente of clientesActivos) {
                if (cliente.plan) {
                    const costoPlan = Number(cliente.plan.precio_mensual);
                    const deudaNuevaTotal = Number(cliente.saldo_actual) + Number(cliente.saldo_aplazado);

                    if (deudaNuevaTotal >= costoPlan && costoPlan > 0) {
                        cliente.estado = "SUSPENDIDO";
                        await clienteRepo.save(cliente);
                        suspendidosCount++;

                        const movimientoCorte = movimientoRepo.create({
                            tipo: "CARGO_MENSUAL", 
                            monto: 0,
                            descripcion: `Servicio Suspendido (Deuda Activa: $${deudaNuevaTotal})`,
                            cliente: cliente
                        });
                        await movimientoRepo.save(movimientoCorte);
                    }
                }
            }

            if (suspendidosCount > 0) {
                const log = logRepo.create({
                    usuario: "SISTEMA",
                    accion: "SUSPENSION_AUTOMATICA",
                    detalles: `Se suspendió el servicio a ${suspendidosCount} clientes por exceder el límite de deuda.`
                });
                await logRepo.save(log);
            }
            console.log(`CRON [Suspensión]: Proceso finalizado. Suspendidos: ${suspendidosCount}`);

        } catch (error) {
            console.error("Error en la automatización de suspensiones:", error);
        }
    },
    {
        scheduled: true,
        timezone: "America/Mexico_City"
    });
};