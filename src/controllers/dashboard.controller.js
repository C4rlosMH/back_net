import { getDashboardStatsService } from "../services/dashboard.service.js";

export const getDashboardStats = async (req, res) => {
    try {
        const stats = await getDashboardStatsService();
        res.json(stats);
    } catch (error) {
        console.error("Error en dashboard controller:", error);
        res.status(500).json({ message: "Error al obtener estadísticas del dashboard" });
    }
};