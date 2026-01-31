import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { Equipo } from "../entities/Equipo.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);
const equipoRepo = AppDataSource.getRepository(Equipo);

export const getDashboardStatsService = async () => {
    // 1. --- FINANZAS (KPIs) ---
    
    // A. Deuda Total: Suma de saldos de clientes
    const deudaTotalResult = await clienteRepo.createQueryBuilder("cliente")
        .select("SUM(cliente.saldo_actual)", "total")
        .where("cliente.saldo_actual > 0")
        .getRawOne();
    const deudaTotal = Number(deudaTotalResult.total || 0);

    // B. Proyección Mensual: Suma de precios de planes de clientes activos
    const proyeccionResult = await clienteRepo.createQueryBuilder("cliente")
        .leftJoin("cliente.plan", "plan")
        .select("SUM(plan.precio_mensual)", "total")
        .where("cliente.estado = :estado", { estado: "ACTIVO" })
        .getRawOne();
    const proyeccionMensual = Number(proyeccionResult.total || 0);

    // C. Recaudado este Mes: Suma de ABONOS del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1); 
    inicioMes.setHours(0,0,0,0);

    const recaudadoResult = await movimientoRepo.createQueryBuilder("mov")
        .select("SUM(mov.monto)", "total")
        .where("mov.tipo = :tipo", { tipo: "ABONO" })
        .andWhere("mov.fecha >= :fecha", { fecha: inicioMes })
        .getRawOne();
    const recaudadoMes = Number(recaudadoResult.total || 0);

    // 2. --- OPERATIVO (Clientes) ---
    const totalClientes = await clienteRepo.count();
    const activos = await clienteRepo.count({ where: { estado: "ACTIVO" } });
    const suspendidos = await clienteRepo.count({ where: { estado: "SUSPENDIDO" } });
    const cortados = await clienteRepo.count({ where: { estado: "CORTADO" } });

    // 3. --- INVENTARIO ---
    const stockRouter = await equipoRepo.count({ where: { tipo: "ROUTER", estado: "ALMACEN" } });
    const stockAntena = await equipoRepo.count({ where: { tipo: "ANTENA", estado: "ALMACEN" } });
    const stockOnu = await equipoRepo.count({ where: { tipo: "ONU", estado: "ALMACEN" } });

    // 4. --- GRÁFICAS (Ingresos últimos 6 meses) ---
    // Nota: Usamos JS para procesar fechas y ser compatibles con cualquier DB (MySQL/Postgres)
    const ingresosRaw = await movimientoRepo.createQueryBuilder("mov")
        .select(["mov.fecha", "mov.monto"])
        .where("mov.tipo = :tipo", { tipo: "ABONO" })
        .orderBy("mov.fecha", "ASC")
        .getMany();

    const ingresosPorMes = {};
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    ingresosRaw.forEach(mov => {
        const fecha = new Date(mov.fecha); // Asegúrate que tu entidad devuelva Date o string fecha válido
        // Filtramos para tomar solo datos recientes si hay muchos
        const mesNombre = mesesNombres[fecha.getMonth()];
        if (!ingresosPorMes[mesNombre]) ingresosPorMes[mesNombre] = 0;
        ingresosPorMes[mesNombre] += Number(mov.monto);
    });

    // Convertimos al formato [{name: "Ene", total: 100}] tomando los últimos 6 keys
    const graficaIngresos = Object.keys(ingresosPorMes).map(key => ({
        name: key,
        total: ingresosPorMes[key]
    })).slice(-6);

    // 5. --- GRÁFICA PLANES ---
    const clientesPorPlanRaw = await clienteRepo.createQueryBuilder("cliente")
        .leftJoin("cliente.plan", "plan")
        .select("plan.nombre", "nombre")
        .addSelect("COUNT(cliente.id)", "cantidad")
        .groupBy("plan.nombre")
        .getRawMany();

    const graficaPlanes = clientesPorPlanRaw.map(d => ({
        name: d.nombre || "Sin Plan",
        value: parseInt(d.cantidad)
    }));

    // RETORNO ESTRUCTURADO
    return {
        financiero: {
            deuda_total_clientes: deudaTotal,
            proyeccion_mensual: proyeccionMensual,
            recaudado_actual: recaudadoMes,
            porcentaje_recuperacion: proyeccionMensual > 0 
                ? ((recaudadoMes / proyeccionMensual) * 100).toFixed(1) + "%" 
                : "0%"
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
        graficaPlanes
    };
};