import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { Equipo } from "../entities/Equipo.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);
const equipoRepo = AppDataSource.getRepository(Equipo);

export const getDashboardStatsService = async () => {
    // 1. --- FINANZAS ---
    
    // Deuda Total (Cartera Vencida): Suma de saldos positivos de todos los clientes
    const deudaTotalResult = await clienteRepo.createQueryBuilder("cliente")
        .select("SUM(cliente.saldo_actual)", "total")
        .where("cliente.saldo_actual > 0")
        .getRawOne();
    const deudaTotal = Number(deudaTotalResult.total || 0);

    // Proyección Mensual: Cuánto deberíamos cobrar si todos los activos pagan su plan
    // (Hacemos un join con Plan para sumar los precios)
    const proyeccionResult = await clienteRepo.createQueryBuilder("cliente")
        .leftJoin("cliente.plan", "plan")
        .select("SUM(plan.precio_mensual)", "total")
        .where("cliente.estado = :estado", { estado: "ACTIVO" })
        .getRawOne();
    const proyeccionMensual = Number(proyeccionResult.total || 0);

    // Recaudado este Mes: Suma de ABONOS desde el día 1 del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1); // Primer día del mes
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

    // 3. --- INVENTARIO (Stock en Almacén) ---
    // Contamos cuántos equipos libres tenemos para instalar
    const stockRouter = await equipoRepo.count({ where: { tipo: "ROUTER", estado: "ALMACEN" } });
    const stockAntena = await equipoRepo.count({ where: { tipo: "ANTENA", estado: "ALMACEN" } });
    const stockOnu = await equipoRepo.count({ where: { tipo: "ONU", estado: "ALMACEN" } });

    return {
        financiero: {
            deuda_total_clientes: deudaTotal, // Dinero en la calle (Lo que te deben)
            proyeccion_mensual: proyeccionMensual, // Lo que deberías facturar
            recaudado_actual: recaudadoMes, // Lo que ya entró al banco este mes
            porcentaje_recuperacion: proyeccionMensual > 0 ? ((recaudadoMes / proyeccionMensual) * 100).toFixed(1) + "%" : "0%"
        },
        clientes: {
            total: totalClientes,
            resumen: { activos, suspendidos, cortados }
        },
        inventario_disponible: {
            routers: stockRouter,
            antenas: stockAntena,
            onus: stockOnu
        }
    };
};