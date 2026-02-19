import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { Equipo } from "../entities/Equipo.js";
import { SystemLog } from "../entities/SystemLog.js";
import { Between, In } from "typeorm";

const clienteRepo = AppDataSource.getRepository(Cliente);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);
const equipoRepo = AppDataSource.getRepository(Equipo);
const logRepo = AppDataSource.getRepository(SystemLog);

export const getDashboardStatsService = async () => {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

    // --- 1. ALERTAS (Vencimientos y Periodo de Gracia de 5 días) ---
    const diaHoy = hoy.getDate();
    const diasGracia = [];
    
    for (let i = 0; i <= 5; i++) {
        let d = diaHoy - i;
        if (d <= 0) { 
            const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
            d = ultimoDiaMesAnterior + d;
        }
        diasGracia.push(d);
    }

    const vencimientosEnGracia = await clienteRepo.find({
        select: ["id", "nombre_completo", "telefono", "direccion", "dia_pago", "saldo_actual", "saldo_aplazado", "confiabilidad"],
        where: { dia_pago: In(diasGracia), estado: "ACTIVO" },
        relations: ["plan"]
    });

    const vencimientosPendientes = vencimientosEnGracia.filter(c => Number(c.saldo_actual) > 0);

    // --- 2. LOGS ---
    const actividadReciente = await logRepo.find({ order: { fecha: "DESC" }, take: 10 });

    // --- 3. FINANZAS Y METAS QUINCENALES (Agrupadas por Ciclo de Facturación) ---
    const clientesActivos = await clienteRepo.find({ where: { estado: "ACTIVO" }, relations: ["plan"] });
    let metaQ1 = 0, metaQ2 = 0;

    clientesActivos.forEach(c => {
        if (c.plan) {
            if (c.dia_pago <= 15) metaQ1 += Number(c.plan.precio_mensual);
            else metaQ2 += Number(c.plan.precio_mensual);
        }
    });

    // CORRECCIÓN: Traemos los movimientos CON los datos del cliente para saber a qué grupo pertenecen
    const movimientosMes = await movimientoRepo.find({
        where: { tipo: In(["ABONO", "APLAZAMIENTO"]), fecha: Between(inicioMes, finMes) },
        relations: ["cliente"] 
    });

    let recaudadoTotal = 0, efectivo = 0, banco = 0, aplazadosCount = 0;
    let cobradoA_TiempoQ1 = 0, cobradoRecuperadoQ1 = 0;
    let cobradoA_TiempoQ2 = 0, cobradoRecuperadoQ2 = 0;

    movimientosMes.forEach(m => {
        if (m.tipo === "APLAZAMIENTO") {
            aplazadosCount++;
            return;
        }

        const monto = Number(m.monto);
        recaudadoTotal += monto;
        if (m.metodo_pago === 'EFECTIVO') efectivo += monto; else banco += monto;

        const esRecuperado = m.descripcion && m.descripcion.includes("Recuperación de Adeudo");
        
        // NUEVA LÓGICA: Evaluamos el 'dia_pago' del cliente, NO la fecha del movimiento
        const diaPagoCliente = m.cliente ? m.cliente.dia_pago : 15; // Por defecto a Q1 si no hay cliente

        if (diaPagoCliente <= 15) {
            if (esRecuperado) cobradoRecuperadoQ1 += monto; else cobradoA_TiempoQ1 += monto;
        } else {
            if (esRecuperado) cobradoRecuperadoQ2 += monto; else cobradoA_TiempoQ2 += monto;
        }
    });

    // --- 4. DEUDA REAL ---
    const listaPendientes = await clienteRepo.createQueryBuilder("c")
        .select(["c.id", "c.nombre_completo", "c.telefono", "c.direccion", "c.saldo_actual", "c.saldo_aplazado", "c.confiabilidad", "c.dia_pago", "c.estado"])
        .where("(c.saldo_actual > 0 OR c.saldo_aplazado > 0)")
        .andWhere("c.estado != :baja", { baja: "BAJA" })
        .getMany();
    
    const deudaTotalReales = listaPendientes.reduce((acc, c) => acc + Number(c.saldo_actual) + Number(c.saldo_aplazado), 0);

    const clientesEnRiesgoCount = await clienteRepo.createQueryBuilder("c")
        .where("c.confiabilidad < 60")
        .andWhere("c.estado != :baja", { baja: "BAJA" })
        .getCount();

    // --- 5. OPERATIVO ---
    const totalClientes = await clienteRepo.count();
    const activos = clientesActivos.length;
    const suspendidos = await clienteRepo.count({ where: { estado: "SUSPENDIDO" } });
    const cortados = await clienteRepo.count({ where: { estado: "CORTADO" } });

    const stockRouter = await equipoRepo.count({ where: { tipo: "ROUTER", estado: "ALMACEN" } });
    const stockAntena = await equipoRepo.count({ where: { tipo: "ANTENA", estado: "ALMACEN" } });
    const stockOnu = await equipoRepo.count({ where: { tipo: "ONU", estado: "ALMACEN" } });

    // --- 6. GRÁFICA DE INGRESOS ---
    const graficaIngresos = [];
    const mesesNombres = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    
    for (let i = 5; i >= 0; i--) {
        const targetMonth = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const firstDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
        const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);

        const result = await movimientoRepo.createQueryBuilder("m")
            .select("SUM(m.monto)", "total")
            .where("m.tipo = :tipo", { tipo: "ABONO" })
            .andWhere("m.fecha >= :start AND m.fecha <= :end", { start: firstDay, end: lastDay })
            .getRawOne();

        graficaIngresos.push({
            name: mesesNombres[targetMonth.getMonth()],
            total: result.total ? Number(result.total) : 0
        });
    }

    return {
        financiero: {
            recaudado_total: recaudadoTotal,
            metas: {
                q1: { estimada: metaQ1, a_tiempo: cobradoA_TiempoQ1, recuperado: cobradoRecuperadoQ1 },
                q2: { estimada: metaQ2, a_tiempo: cobradoA_TiempoQ2, recuperado: cobradoRecuperadoQ2 }
            },
            arqueo: { efectivo, banco },
            proyeccion_proximo_mes: metaQ1 + metaQ2 + deudaTotalReales,
            deuda_total_clientes: deudaTotalReales,
            aplazados_count: aplazadosCount
        },
        alertas: {
            vencimientos_hoy: vencimientosPendientes,
            actividad_reciente: actividadReciente
        },
        pendientes_pago: { total_deuda: deudaTotalReales, lista: listaPendientes },
        clientes: { 
            total: totalClientes, 
            resumen: { activos, suspendidos, cortados, en_riesgo: clientesEnRiesgoCount } 
        },
        inventario_disponible: { routers: stockRouter, antenas: stockAntena, onus: stockOnu },
        graficaIngresos: graficaIngresos,
        graficaPlanes: []
    };
};