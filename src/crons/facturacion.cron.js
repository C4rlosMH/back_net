import cron from "node-cron";
import { In } from "typeorm";
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { SystemLog } from "../entities/SystemLog.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const logRepo = AppDataSource.getRepository(SystemLog);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

export const iniciarCronFacturacion = () => {
    // Se ejecuta a las 8:00 AM
    cron.schedule('0 8 * * *', async () => {
        console.log("CRON [Facturación]: Generando cargos mensuales...");
        
        try {
            const hoy = new Date();
            const diaActual = hoy.getDate();
            const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

            let diasCobro = [diaActual];
            if (diaActual === ultimoDiaMes) {
                for (let i = diaActual + 1; i <= 31; i++) {
                    diasCobro.push(i);
                }
            }

            const clientesACobrar = await clienteRepo.find({
                where: { dia_pago: In(diasCobro), estado: "ACTIVO" },
                relations: ["plan"]
            });

            let cargosGenerados = 0;

            for (const cliente of clientesACobrar) {
                if (cliente.plan) {
                    const costo = Number(cliente.plan.precio_mensual);
                    cliente.saldo_actual = Number(cliente.saldo_actual) + costo;
                    
                    const movimiento = movimientoRepo.create({
                        tipo: "CARGO_MENSUAL",
                        monto: costo,
                        descripcion: `Cargo mensual automático (${cliente.plan.nombre})`,
                        cliente: cliente
                    });

                    await AppDataSource.transaction(async manager => {
                        await manager.getRepository(MovimientoFinanciero).save(movimiento);
                        await manager.getRepository(Cliente).save(cliente);
                    });
                    
                    cargosGenerados++;
                }
            }

            if (cargosGenerados > 0) {
                const log = logRepo.create({
                    usuario: "SISTEMA",
                    accion: "CARGOS_AUTOMATICOS",
                    detalles: `Se generaron ${cargosGenerados} facturas automáticas para el día ${diaActual}.`
                });
                await logRepo.save(log);
            }
            
            console.log(`CRON [Facturación]: Se generaron cargos para ${cargosGenerados} clientes.`);

        } catch (error) {
            console.error("Error en la automatización de facturación:", error);
        }
        
    },
    {
        scheduled: true,
        timezone: "America/Mexico_City"
    });
};