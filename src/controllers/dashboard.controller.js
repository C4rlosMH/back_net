import { getDashboardStatsService } from "../services/dashboard.service.js";

export const getDashboard = async (req, res) => {
    try {
        const stats = await getDashboardStatsService();
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al generar el dashboard", error: error.message });
    }
};