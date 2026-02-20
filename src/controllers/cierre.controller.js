import { AppDataSource } from "../config/data-source.js";
import { CierreQuincenal } from "../entities/CierreQuincenal.js";

export const getCierres = async (req, res) => {
    try {
        const cierresRepo = AppDataSource.getRepository(CierreQuincenal);
        
        // Obtenemos todos los cierres ordenados del más reciente al más antiguo
        const cierres = await cierresRepo.find({
            order: { createdAt: "DESC" }
        });
        
        res.json(cierres);
    } catch (error) {
        console.error("Error al obtener cierres:", error);
        res.status(500).json({ message: "Error al obtener cierres quincenales" });
    }
};