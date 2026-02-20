import cron from "node-cron";
import { AppDataSource } from "../config/data-source.js";
import { CierreQuincenal } from "../entities/CierreQuincenal.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { Between, In } from "typeorm";

const cierreRepo = AppDataSource.getRepository(CierreQuincenal);
const clienteRepo = AppDataSource.getRepository(Cliente);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);

export const iniciarCronCierres = () => {
    // Se ejecuta el día 16 de cada mes a las 00:05 (Para evaluar la Q1: del 1 al 15)
    cron.schedule('5 0 16 * *', () => generarCierreAutomatico(1));

    // Se ejecuta el día 1 de cada mes a las 00:05 (Para evaluar la Q2: del 16 al final de mes)
    cron.schedule('5 0 1 * *', () => generarCierreAutomatico(2));
};

const generarCierreAutomatico = async (quincena) => {
    try {
        const hoy = new Date();
        // Si evaluamos Q2 (día 1), la referencia es el mes anterior
        const mesReferencia = quincena === 2 ? hoy.getMonth() - 1 : hoy.getMonth();
        const anioReferencia = quincena === 2 && hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear();
        
        // Determinar fechas
        const inicio = quincena === 1 
            ? new Date(anioReferencia, mesReferencia, 1) 
            : new Date(anioReferencia, mesReferencia, 16);
            
        const fin = quincena === 1 
            ? new Date(anioReferencia, mesReferencia, 15, 23, 59, 59) 
            : new Date(anioReferencia, mesReferencia + 1, 0, 23, 59, 59);

        const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const nombrePeriodo = quincena === 1 
            ? `1-15 ${mesesNombres[inicio.getMonth()]} ${anioReferencia}`
            : `16-${fin.getDate()} ${mesesNombres[inicio.getMonth()]} ${anioReferencia}`;

        // 1. Calcular Meta Estimada
        const clientesActivos = await clienteRepo.find({ where: { estado: "ACTIVO" }, relations: ["plan"] });
        let metaEstimada = 0;
        clientesActivos.forEach(c => {
            if (c.plan) {
                if (quincena === 1 && c.dia_pago <= 15) metaEstimada += Number(c.plan.precio_mensual);
                if (quincena === 2 && c.dia_pago > 15) metaEstimada += Number(c.plan.precio_mensual);
            }
        });

        // 2. Calcular Cobrado (A tiempo y Recuperado)
        const movimientos = await movimientoRepo.find({
            where: { tipo: "ABONO", fecha: Between(inicio, fin) },
            relations: ["cliente"]
        });

        let cobradoATiempo = 0;
        let cobradoRecuperado = 0;

        movimientos.forEach(m => {
            const diaPagoCliente = m.cliente ? m.cliente.dia_pago : 15;
            const esMismaQuincena = (quincena === 1 && diaPagoCliente <= 15) || (quincena === 2 && diaPagoCliente > 15);
            const esRecuperado = m.descripcion && m.descripcion.includes("Recuperación de Adeudo");

            if (esMismaQuincena) {
                if (esRecuperado) cobradoRecuperado += Number(m.monto);
                else cobradoATiempo += Number(m.monto);
            } else {
                // Si cobró de un cliente de otra quincena, se considera recuperado para esta
                cobradoRecuperado += Number(m.monto); 
            }
        });

        const faltante = metaEstimada - cobradoATiempo - cobradoRecuperado;

        // Guardar el registro
        const nuevoCierre = cierreRepo.create({
            periodo: nombrePeriodo,
            meta_estimada: metaEstimada,
            cobrado_a_tiempo: cobradoATiempo,
            cobrado_recuperado: cobradoRecuperado,
            faltante: faltante > 0 ? faltante : 0
        });

        await cierreRepo.save(nuevoCierre);
        console.log(`Cierre quincenal generado: ${nombrePeriodo}`);

    } catch (error) {
        console.error("Error al generar cierre quincenal:", error);
    }
};