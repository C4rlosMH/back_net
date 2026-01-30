import { crearEquipoService, asignarEquiposService, getInventarioService } from "../services/equipo.service.js";

export const createEquipo = async (req, res) => {
    try {
        const equipo = await crearEquipoService(req.body);
        res.status(201).json({ message: "Equipo registrado", data: equipo });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const asignarEquipos = async (req, res) => {
    try {
        const { clienteId, equiposIds } = req.body;
        
        if (!clienteId || !equiposIds || !Array.isArray(equiposIds)) {
            return res.status(400).json({ message: "Formato inválido. Se requiere clienteId y un array de equiposIds." });
        }

        const result = await asignarEquiposService(clienteId, equiposIds);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getInventario = async (req, res) => {
    try {
        const { estado } = req.query; // Permite filtrar: /api/equipos?estado=ALMACEN
        const equipos = await getInventarioService(estado);
        res.json(equipos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener inventario" });
    }
};