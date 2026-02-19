import cron from "node-cron";
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { SystemLog } from "../entities/SystemLog.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { In } from "typeorm";

const clienteRepo = AppDataSource.getRepository(Cliente);
const logRepo = AppDataSource.getRepository(SystemLog);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

export const iniciarCronJobs = () => {
    
    // --- 1. MOTOR DE FACTURACION (MODIFICADO PARA PRUEBA) ---
    // Se ejecutara cada minuto
    cron.schedule('0 8 * * *', async () => {
    //cron.schedule('* * * * *', async () => {
        console.log("CRON PRUEBA: Generando cargos mensuales...");
        
        try {
            const hoy = new Date();
            //const diaActual = 15;
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
                        descripcion: `Cargo mensual automatico (${cliente.plan.nombre})`,
                        cliente: cliente
                    });

                    // SOLUCION: Le decimos al manager explicitamente que repositorios usar
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
                    detalles: `PRUEBA: Se generaron ${cargosGenerados} facturas automaticas para el dia 15.`
                });
                await logRepo.save(log);
            }
            
            console.log(`PRUEBA EXITOSA: Se le cobro a ${cargosGenerados} clientes. POR FAVOR APAGA EL SERVIDOR AHORA (Ctrl + C).`);

        } catch (error) {
            console.error("Error en la automatizacion de facturacion:", error);
        }
    });

    // --- 2. PENALIZACION Y APLAZAMIENTO (Lo dejamos con su hora normal para no interferir) ---
    cron.schedule('0 8 * * *', async () => {
        console.log("CRON: Ejecutando revision automatica de aplazamientos (Dia 6)...");
        
        try {
            const hoy = new Date();
            const diaActual = hoy.getDate();
            
            // Calculamos cual fue el dia de pago hace exactamente 6 dias
            let diaObjetivo = diaActual - 6;
            if (diaObjetivo <= 0) {
                const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
                diaObjetivo = ultimoDiaMesAnterior + diaObjetivo;
            }

            // Buscamos clientes que tenian que pagar ese dia
            const morosos = await clienteRepo.find({
                where: { dia_pago: diaObjetivo }
            });

            let aplazadosCount = 0;

            for (const cliente of morosos) {
                // Si en su dia 6 todavia tienen saldo en el mes corriente...
                if (Number(cliente.saldo_actual) > 0) {
                    
                    // 1. Movemos la deuda al campo aplazado
                    cliente.saldo_aplazado = Number(cliente.saldo_aplazado) + Number(cliente.saldo_actual);
                    cliente.saldo_actual = 0; 
                    
                    // 2. Aplicamos la penalizacion grave a su confiabilidad (-15%)
                    cliente.confiabilidad = Math.max(0, (cliente.confiabilidad ?? 100) - 15);
                    
                    await clienteRepo.save(cliente);
                    aplazadosCount++;
                }
            }

            // Registramos en la bitacora
            if (aplazadosCount > 0) {
                const log = logRepo.create({
                    usuario: "SISTEMA",
                    accion: "APLAZAMIENTO_AUTOMATICO",
                    detalles: `Se aplazo la deuda y se penalizo a ${aplazadosCount} clientes por agotar sus 5 dias de gracia.`
                });
                await logRepo.save(log);
            }

        } catch (error) {
            console.error("Error en la automatizacion de aplazamientos:", error);
        }
    });
};