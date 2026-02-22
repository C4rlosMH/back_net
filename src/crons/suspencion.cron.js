import cron from "node-cron";
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { SystemLog } from "../entities/SystemLog.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
// --- IMPORTAMOS EL SERVICIO DE MIKROTIK ---
import { suspenderClientePPPoE } from "../services/mikrotik.service.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const logRepo = AppDataSource.getRepository(SystemLog);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

export const iniciarCronSuspension = () => {
    // Se ejecuta a las 10:00 AM
    cron.schedule('0 10 * * *', async () => {
        console.log("CRON [Suspensión]: Revisando clientes para cortes estrictos (Límite 5 meses)...");
        
        try {
            const clientesActivos = await clienteRepo.find({
                where: { estado: "ACTIVO" },
                relations: ["plan"]
            });

            let suspendidosCount = 0;

            for (const cliente of clientesActivos) {
                if (cliente.plan) {
                    const costoPlan = Number(cliente.plan.precio_mensual);
                    // La deuda corriente es la suma del saldo vencido y el saldo del periodo actual
                    const deudaCorriente = Number(cliente.saldo_actual) + Number(cliente.saldo_aplazado);

                    // Se suspende si la deuda alcanza o supera los 5 MESES (costoPlan * 5).
                    if (deudaCorriente >= (costoPlan * 5) && costoPlan > 0) {
                        
                        // 1. Cambiamos el estado en la base de datos
                        cliente.estado = "SUSPENDIDO";
                        await clienteRepo.save(cliente);
                        suspendidosCount++;

                        // 2. Ejecutamos el corte físico en el router MikroTik (Si aplica)
                        if (cliente.tipo_conexion === 'fibra' && cliente.usuario_pppoe) {
                            console.log(`[Cron] Ejecutando corte en MikroTik para el usuario: ${cliente.usuario_pppoe}`);
                            await suspenderClientePPPoE(cliente.usuario_pppoe);
                        }

                        // 3. Registramos el movimiento
                        const movimientoCorte = movimientoRepo.create({
                            tipo: "CARGO_MENSUAL", 
                            monto: 0,
                            descripcion: `Servicio Suspendido (Deuda Corriente Acumulada: $${deudaCorriente})`,
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
                    detalles: `Se suspendió el servicio a ${suspendidosCount} clientes por exceder el límite de 5 meses de deuda corriente.`
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