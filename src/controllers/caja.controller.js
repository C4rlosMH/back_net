import { AppDataSource } from "../config/data-source.js";
import { CajaDistribucion } from "../entities/CajaDistribucion.js";
import { registrarLog } from "../services/log.service.js"; // <--- Importación

const cajaRepo = AppDataSource.getRepository(CajaDistribucion);

export const getCajas = async (req, res) => {
    try {
        const cajas = await cajaRepo.find({ 
            order: { nombre: "ASC" },
            relations: ["clientes"] 
        });
        res.json(cajas);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createCaja = async (req, res) => {
    try {
        const nuevaCaja = cajaRepo.create(req.body);
        const resultado = await cajaRepo.save(nuevaCaja);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "CREAR_CAJA",
            `Se instalo una nueva Caja NAP: ${resultado.nombre}`,
            "CajaDistribucion",
            resultado.id
        );

        res.json(resultado);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error al crear la caja" });
    }
};

export const updateCaja = async (req, res) => {
    try {
        const { id } = req.params;
        const caja = await cajaRepo.findOneBy({ id: parseInt(id) });

        if (!caja) return res.status(404).json({ message: "Caja no encontrada" });

        cajaRepo.merge(caja, req.body);
        const resultado = await cajaRepo.save(caja);

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "ACTUALIZAR_CAJA",
            `Se actualizaron los datos de la Caja NAP: ${caja.nombre}`,
            "CajaDistribucion",
            caja.id
        );

        res.json(resultado);
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar" });
    }
};

export const deleteCaja = async (req, res) => {
    try {
        const { id } = req.params;
        const caja = await cajaRepo.findOneBy({ id: parseInt(id) });
        
        if (!caja) return res.status(404).json({ message: "Caja no encontrada" });
        
        const nombreCaja = caja.nombre;
        const result = await cajaRepo.delete({ id: parseInt(id) });

        if (result.affected === 0) {
            return res.status(404).json({ message: "Caja no encontrada" });
        }

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "ELIMINAR_CAJA",
            `Se elimino la Caja NAP: ${nombreCaja}`,
            "CajaDistribucion",
            parseInt(id)
        );

        res.sendStatus(204); 
    } catch (error) {
        return res.status(500).json({ message: "No se puede eliminar, posiblemente tiene clientes asignados." });
    }
};