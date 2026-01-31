import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { Equipo } from "../entities/Equipo.js";

const clienteRepo = AppDataSource.getRepository(Cliente);
const movRepo = AppDataSource.getRepository(MovimientoFinanciero);
const equipoRepo = AppDataSource.getRepository(Equipo);

export const getDashboardStats = async (req, res) => {
    try {
        // --- 1. DATOS GENERALES (YA LOS TENÍAS) ---
        const totalClientes = await clienteRepo.count();
        const clientesActivos = await clienteRepo.count({ where: { estado: 'ACTIVO' } });
        const clientesCortados = await clienteRepo.count({ where: { estado: 'CORTADO' } });
        
        const ingresosResult = await movRepo
            .createQueryBuilder("mov")
            .select("SUM(mov.monto)", "total")
            .where("mov.tipo = :tipo", { tipo: "ABONO" })
            .getRawOne();
        const totalIngresos = ingresosResult.total || 0;

        // --- 2. NUEVO: DATOS PARA GRÁFICA DE INGRESOS (Últimos 6 meses) ---
        // Esta consulta agrupa los pagos tipo 'ABONO' por mes
        const ingresosPorMesRaw = await movRepo
            .createQueryBuilder("mov")
            .select("EXTRACT(MONTH FROM mov.fecha)", "mes") // Extrae el número del mes (1-12)
            .addSelect("SUM(mov.monto)", "total")
            .where("mov.tipo = :tipo", { tipo: "ABONO" })
            .groupBy("mes")
            .orderBy("mes", "ASC")
            .limit(6)
            .getRawMany();

        // Convertimos números de mes (1, 2...) a nombres (Ene, Feb...)
        const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        
        const graficaIngresos = ingresosPorMesRaw.map(d => ({
            name: mesesNombres[parseInt(d.mes) - 1], 
            total: parseFloat(d.total)
        }));

        // --- 3. NUEVO: DATOS PARA GRÁFICA DE PLANES (Pastel) ---
        // Cuenta cuántos clientes hay en cada plan
        const clientesPorPlanRaw = await clienteRepo
            .createQueryBuilder("cliente")
            .leftJoin("cliente.plan", "plan")
            .select("plan.nombre", "nombre")
            .addSelect("COUNT(cliente.id)", "cantidad")
            .groupBy("plan.nombre")
            .getRawMany();

        const graficaPlanes = clientesPorPlanRaw.map(d => ({
            name: d.nombre || "Sin Plan",
            value: parseInt(d.cantidad)
        }));

        // ENVIAMOS TODO JUNTO AL FRONTEND
        res.json({
            totalClientes,
            clientesActivos,
            clientesCortados,
            totalIngresos,
            graficaIngresos, // <--- Ahora sí enviamos los datos de las barras
            graficaPlanes    // <--- Y los datos del pastel
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};