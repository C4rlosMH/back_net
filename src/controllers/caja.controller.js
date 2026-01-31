import { AppDataSource } from "../config/data-source.js";
import { CajaDistribucion } from "../entities/CajaDistribucion.js";

const cajaRepo = AppDataSource.getRepository(CajaDistribucion);

// Obtener todas
export const getCajas = async (req, res) => {
    try {
        const cajas = await cajaRepo.find({ order: { nombre: "ASC" } });
        res.json(cajas);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Crear nueva
export const createCaja = async (req, res) => {
    try {
        // Creamos la instancia con los datos del body
        const nuevaCaja = cajaRepo.create(req.body);
        
        // Guardamos en BD
        const resultado = await cajaRepo.save(nuevaCaja);
        
        res.json(resultado);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error al crear la caja" });
    }
};

// Actualizar
export const updateCaja = async (req, res) => {
    try {
        const { id } = req.params;
        const caja = await cajaRepo.findOneBy({ id: parseInt(id) });

        if (!caja) return res.status(404).json({ message: "Caja no encontrada" });

        // Actualizamos los campos recibidos
        cajaRepo.merge(caja, req.body);
        
        const resultado = await cajaRepo.save(caja);
        res.json(resultado);
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar" });
    }
};

// Eliminar
export const deleteCaja = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await cajaRepo.delete({ id: parseInt(id) });

        if (result.affected === 0) {
            return res.status(404).json({ message: "Caja no encontrada" });
        }

        res.sendStatus(204); // 204 No Content
    } catch (error) {
        // Tip: Si falla por llave foránea (tiene clientes), TypeORM lanza error
        return res.status(500).json({ message: "No se puede eliminar, posiblemente tiene clientes asignados." });
    }
};