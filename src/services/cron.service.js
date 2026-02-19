import cron from "node-cron";
import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { SystemLog } from "../entities/SystemLog.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { In } from "typeorm";
import { enviarNotificacion } from "./whatsapp.service.js"; // <--- IMPORTACIÓN NUEVA

const clienteRepo = AppDataSource.getRepository(Cliente);
const logRepo = AppDataSource.getRepository(SystemLog);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

export const iniciarCronJobs = () => {
    
    // --- 1. MOTOR DE FACTURACION ---
    // Se ejecuta a las 8:00 AM para generar los cargos del día
    cron.schedule('0 8 * * *', async () => {
        console.log("CRON: Generando cargos mensuales...");
        
        try {
            const hoy = new Date();
            const diaActual = hoy.getDate();
            const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

            // Si es fin de mes (ej. 30 o 31), cobramos también a los del 31 (si hoy es 30 y el mes termina en 30)
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
            
            console.log(`CRON: Se generaron cargos para ${cargosGenerados} clientes.`);

        } catch (error) {
            console.error("Error en la automatización de facturación:", error);
        }
    });

    // --- 2. PENALIZACIÓN Y APLAZAMIENTO ---
    // Se ejecuta a las 8:00 AM (revisa quién debió pagar hace 6 días)
    cron.schedule('0 8 * * *', async () => {
        console.log("CRON: Ejecutando revisión automática de aplazamientos (Día 6)...");
        
        try {
            const hoy = new Date();
            const diaActual = hoy.getDate();
            
            // Calculamos cuál fue el día de pago hace exactamente 6 días
            let diaObjetivo = diaActual - 6;
            if (diaObjetivo <= 0) {
                const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
                diaObjetivo = ultimoDiaMesAnterior + diaObjetivo;
            }

            // Buscamos clientes que tenían que pagar ese día
            const morosos = await clienteRepo.find({
                where: { dia_pago: diaObjetivo }
            });

            let aplazadosCount = 0;

            for (const cliente of morosos) {
                // Si en su día 6 todavía tienen saldo en el mes corriente...
                if (Number(cliente.saldo_actual) > 0) {
                    
                    // 1. Movemos la deuda al campo aplazado
                    cliente.saldo_aplazado = Number(cliente.saldo_aplazado) + Number(cliente.saldo_actual);
                    cliente.saldo_actual = 0; 
                    
                    // 2. Aplicamos la penalización grave a su confiabilidad (-15%)
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

    // --- 3. NOTIFICACIONES WHATSAPP ---
    // Se ejecuta a las 9:00 AM todos los días
    cron.schedule('0 9 * * *', async () => {
        console.log("CRON: Verificando notificaciones de WhatsApp...");
        
        try {
            const hoy = new Date();
            const diaHoy = hoy.getDate();
            
            // A) AVISO PREVIO (2 DÍAS ANTES)
            // Calculamos fecha objetivo: Hoy + 2 días
            let diaObjetivoPrevio = diaHoy + 2;
            
            // Ajuste simple para fin de mes (si el resultado es > 31, no enviará nada, 
            // para mayor precisión mensual se requeriría una librería de fechas, 
            // pero esto cubre la mayoría de casos básicos).
            
            const clientesPorVencer = await clienteRepo.find({
                where: { dia_pago: diaObjetivoPrevio, estado: "ACTIVO" },
                relations: ["plan"]
            });

            for (const cliente of clientesPorVencer) {
                 // Enviamos recordatorio amable
                 await enviarNotificacion(cliente, 'ANTICIPADO');
            }

            // B) AVISO DE MOROSIDAD / ADVERTENCIA (3 DÍAS DESPUÉS DEL CORTE)
            // Calculamos fecha objetivo: Hoy - 3 días
            let diaObjetivoMora = diaHoy - 3;
            
            // Ajuste si venimos de fin de mes anterior
            if (diaObjetivoMora <= 0) {
                 const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
                 diaObjetivoMora = ultimoDiaMesAnterior + diaObjetivoMora;
            }

            const clientesMorosos = await clienteRepo.find({
                where: { dia_pago: diaObjetivoMora, estado: "ACTIVO" },
                relations: ["plan"]
            });

            let avisosMoraEnviados = 0;
            for (const cliente of clientesMorosos) {
                // Solo enviamos si TIENE SALDO PENDIENTE
                if (Number(cliente.saldo_actual) > 0) {
                    await enviarNotificacion(cliente, 'SUSPENSION');
                    avisosMoraEnviados++;
                }
            }
            
            if (clientesPorVencer.length > 0 || avisosMoraEnviados > 0) {
                console.log(`CRON WHATSAPP: Se enviaron ${clientesPorVencer.length} recordatorios y ${avisosMoraEnviados} avisos de corte.`);
                
                // Opcional: Guardar log de sistema
                await logRepo.save(logRepo.create({
                    usuario: "BOT_WHATSAPP",
                    accion: "ENVIO_MASIVO",
                    detalles: `Automático: ${clientesPorVencer.length} preventivos, ${avisosMoraEnviados} de morosidad.`
                }));
            }

        } catch (error) {
            console.error("Error enviando notificaciones Cron:", error);
        }
    });
};