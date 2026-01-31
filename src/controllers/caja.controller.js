import { AppDataSource } from "../config/data-source.js";
import { CajaDistribucion } from "../entities/CajaDistribucion.js";

const cajaRepo = AppDataSource.getRepository(CajaDistribucion);

export const getCajas = async (req, res) => {
    try {
        const cajas = await cajaRepo.find();
        res.json(cajas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};