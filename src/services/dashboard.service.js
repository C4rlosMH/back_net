import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { Equipo } from "../entities/Equipo.js";
import { Between, Like } from "typeorm";

const clienteRepo = AppDataSource.getRepository(Cliente);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);
const equipoRepo = AppDataSource.getRepository(Equipo);

export const getDashboardStatsService = async () => {
    const hoy = new Date();
    // Fechas del mes actual
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    
    // Corte de la 1ra Quincena (Día 15)
    const finQ1 = new Date(hoy.getFullYear(), hoy.getMonth(), 15, 23, 59, 59);

    // 1. --- ANÁLISIS DE INGRESOS (Arqueo y Quincenas) ---
    const movimientosMes = await movimientoRepo.find({
        where: {
            tipo: "ABONO",
            fecha: Between(inicioMes, finMes)
        }
    });

    let recaudadoTotal = 0;
    let recaudadoQ1 = 0;
    let recaudadoQ2 = 0;
    let efectivo = 0;
    let banco = 0;
    let aplazadosCount = 0;

    movimientosMes.forEach(m => {
        const monto = Number(m.monto);
        recaudadoTotal += monto;

        // Quincenas
        if (m.fecha <= finQ1) recaudadoQ1 += monto;
        else recaudadoQ2 += monto;

        // Arqueo
        if (m.metodo_pago === 'EFECTIVO') efectivo += monto;
        else banco += monto; // Transferencia, Depósito, etc.

        // Contar promesas de pago (si el monto fue 0 o descripción lo dice)
        if (m.descripcion && (m.descripcion.includes("Promesa") || m.descripcion.includes("Aplazado"))) {
            aplazadosCount++;
        }
    });

    // 2. --- DEUDA REAL (Cartera Vencida Activa) ---
    // Filtramos clientes con deuda > 0.
    const listaPendientes = await clienteRepo.createQueryBuilder("c")
        .select(["c.nombre_completo", "c.telefono", "c.direccion", "c.saldo_actual"])
        .where("c.saldo_actual > 0")
        .andWhere("c.estado != :baja", { baja: "BAJA" })
        .getMany();

    const deudaTotalReales = listaPendientes.reduce((acc, c) => acc + Number(c.saldo_actual), 0);

    // 3. --- PROYECCIÓN PRÓXIMO MES ---
    // (Suma de precios de planes activos) + (Deuda actual acumulada)
    const { totalPlanes } = await clienteRepo.createQueryBuilder("c")
        .leftJoin("c.plan", "plan")
        .select("SUM(plan.precio_mensual)", "totalPlanes")
        .where("c.estado = 'ACTIVO'")
        .getRawOne();
    
    const proyeccion = Number(totalPlanes || 0) + deudaTotalReales;

    // 4. --- DATOS OPERATIVOS ---
    const totalClientes = await clienteRepo.count();
    const activos = await clienteRepo.count({ where: { estado: "ACTIVO" } });
    const suspendidos = await clienteRepo.count({ where: { estado: "SUSPENDIDO" } });
    const cortados = await clienteRepo.count({ where: { estado: "CORTADO" } });

    const stockRouter = await equipoRepo.count({ where: { tipo: "ROUTER", estado: "ALMACEN" } });
    const stockAntena = await equipoRepo.count({ where: { tipo: "ANTENA", estado: "ALMACEN" } });
    const stockOnu = await equipoRepo.count({ where: { tipo: "ONU", estado: "ALMACEN" } });

    // 5. --- GRÁFICAS (Ingresos últimos 6 meses) ---
    const rawIngresos = await movimientoRepo.createQueryBuilder("m")
        .select(["m.fecha", "m.monto"])
        .where("m.tipo = 'ABONO'")
        .orderBy("m.fecha", "ASC")
        .getMany();
    
    const mapIngresos = {};
    const nombresMes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    rawIngresos.forEach(m => {
        const d = new Date(m.fecha);
        const key = nombresMes[d.getMonth()];
        mapIngresos[key] = (mapIngresos[key] || 0) + Number(m.monto);
    });
    
    const graficaIngresos = Object.keys(mapIngresos).slice(-6).map(k => ({ name: k, total: mapIngresos[k] }));

    return {
        financiero: {
            recaudado_total: recaudadoTotal,
            recaudado_q1: recaudadoQ1,
            recaudado_q2: recaudadoQ2,
            recaudado_actual: recaudadoTotal,
            arqueo: {
                efectivo: efectivo,
                banco: banco
            },
            proyeccion_proximo_mes: proyeccion,
            deuda_total_clientes: deudaTotalReales,
            aplazados_count: aplazadosCount
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
            routers: stockRouter,
            antenas: stockAntena,
            onus: stockOnu
        },
        graficaIngresos,
        graficaPlanes: [] 
    };
};