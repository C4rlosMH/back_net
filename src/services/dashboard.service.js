import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { Equipo } from "../entities/Equipo.js";
import { SystemLog } from "../entities/SystemLog.js";
import { Between } from "typeorm";

const clienteRepo = AppDataSource.getRepository(Cliente);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);
const equipoRepo = AppDataSource.getRepository(Equipo);
const logRepo = AppDataSource.getRepository(SystemLog);

export const getDashboardStatsService = async () => {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    
    // 1. ALERTAS (Vencimientos de Hoy)
    const diaHoy = hoy.getDate(); 
    const vencimientosHoy = await clienteRepo.find({
        select: ["id", "nombre_completo", "telefono", "direccion"],
        where: { dia_pago: diaHoy, estado: "ACTIVO" },
        relations: ["plan"]
    });

    // 2. LOGS (Últimos 10)
    const actividadReciente = await logRepo.find({
        order: { fecha: "DESC" },
        take: 10
    });

    // 3. FINANZAS (Quincenas y Arqueo)
    const finQ1 = new Date(hoy.getFullYear(), hoy.getMonth(), 15, 23, 59, 59);
    const movimientosMes = await movimientoRepo.find({
        where: { tipo: "ABONO", fecha: Between(inicioMes, finMes) }
    });

    let recaudadoTotal = 0, recaudadoQ1 = 0, recaudadoQ2 = 0;
    let efectivo = 0, banco = 0, aplazadosCount = 0;

    movimientosMes.forEach(m => {
        const monto = Number(m.monto);
        recaudadoTotal += monto;
        if (m.fecha <= finQ1) recaudadoQ1 += monto; else recaudadoQ2 += monto;
        if (m.metodo_pago === 'EFECTIVO') efectivo += monto; else banco += monto;
        if (m.descripcion && (m.descripcion.includes("Promesa") || m.descripcion.includes("Aplazado"))) aplazadosCount++;
    });

    // 4. DEUDA REAL
    const listaPendientes = await clienteRepo.createQueryBuilder("c")
        .select(["c.nombre_completo", "c.telefono", "c.direccion", "c.saldo_actual"])
        .where("c.saldo_actual > 0")
        .andWhere("c.estado != :baja", { baja: "BAJA" })
        .getMany();
    const deudaTotalReales = listaPendientes.reduce((acc, c) => acc + Number(c.saldo_actual), 0);

    // 5. PROYECCIÓN
    const { totalPlanes } = await clienteRepo.createQueryBuilder("c")
        .leftJoin("c.plan", "plan")
        .select("SUM(plan.precio_mensual)", "totalPlanes")
        .where("c.estado = 'ACTIVO'")
        .getRawOne();
    const proyeccion = Number(totalPlanes || 0) + deudaTotalReales;

    // 6. OPERATIVO E INVENTARIO
    const totalClientes = await clienteRepo.count();
    const activos = await clienteRepo.count({ where: { estado: "ACTIVO" } });
    const suspendidos = await clienteRepo.count({ where: { estado: "SUSPENDIDO" } });
    const cortados = await clienteRepo.count({ where: { estado: "CORTADO" } });

    const stockRouter = await equipoRepo.count({ where: { tipo: "ROUTER", estado: "ALMACEN" } });
    const stockAntena = await equipoRepo.count({ where: { tipo: "ANTENA", estado: "ALMACEN" } });
    const stockOnu = await equipoRepo.count({ where: { tipo: "ONU", estado: "ALMACEN" } });

    // 7. GRÁFICA INGRESOS (6 Meses)
    const rawIngresos = await movimientoRepo.createQueryBuilder("m")
        .select(["m.fecha", "m.monto"])
        .where("m.tipo = 'ABONO'")
        .orderBy("m.fecha", "ASC")
        .getMany();
    const mapIngresos = {};
    const nombresMes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    rawIngresos.forEach(m => {
        const d = new Date(m.fecha);
        mapIngresos[nombresMes[d.getMonth()]] = (mapIngresos[nombresMes[d.getMonth()]] || 0) + Number(m.monto);
    });
    const graficaIngresos = Object.keys(mapIngresos).slice(-6).map(k => ({ name: k, total: mapIngresos[k] }));

    return {
        financiero: {
            recaudado_total: recaudadoTotal,
            recaudado_q1: recaudadoQ1,
            recaudado_q2: recaudadoQ2,
            recaudado_actual: recaudadoTotal,
            arqueo: { efectivo, banco },
            proyeccion_proximo_mes: proyeccion,
            deuda_total_clientes: deudaTotalReales,
            aplazados_count: aplazadosCount
        },
        alertas: {
            vencimientos_hoy: vencimientosHoy,
            actividad_reciente: actividadReciente
        },
        pendientes_pago: {
            total_deuda: deudaTotalReales,
            lista: listaPendientes
        },
        clientes: {
            total: totalClientes,
            resumen: { activos, suspendidos, cortados }
        },
        inventario_disponible: {
            routers: stockRouter, antenas: stockAntena, onus: stockOnu
        },
        graficaIngresos,
        graficaPlanes: []
    };
};