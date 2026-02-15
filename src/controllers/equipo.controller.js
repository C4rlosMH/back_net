import { crearEquipoService, asignarEquiposService, getInventarioService, deleteEquipoService } from "../services/equipo.service.js";
import { registrarLog } from "../services/log.service.js"; // <--- Importación

export const createEquipo = async (req, res) => {
    try {
        const equipo = await crearEquipoService(req.body);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "CREAR_EQUIPO",
            `Se agrego un nuevo equipo al inventario: ${equipo.marca} ${equipo.modelo} (MAC: ${equipo.mac_address})`,
            "Equipo",
            equipo.id
        );

        res.status(201).json({ message: "Equipo registrado", data: equipo });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const asignarEquipos = async (req, res) => {
    try {
        const { clienteId, equiposIds } = req.body;
        
        if (!clienteId || !equiposIds || !Array.isArray(equiposIds)) {
            return res.status(400).json({ message: "Formato invalido. Se requiere clienteId y un array de equiposIds." });
        }

        const result = await asignarEquiposService(clienteId, equiposIds);

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "ASIGNAR_EQUIPO",
            `Se asignaron ${equiposIds.length} equipo(s) al cliente ID: ${clienteId}`,
            "Cliente",
            clienteId
        );

        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getInventario = async (req, res) => {
    try {
        const { estado } = req.query; 
        const equipos = await getInventarioService(estado);
        res.json(equipos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener inventario" });
    }
};

// Función de eliminar que habíamos creado (con su log)
export const deleteEquipo = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteEquipoService(id);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "ELIMINAR_EQUIPO",
            `Se elimino definitivamente un equipo del inventario (ID: ${id})`,
            "Equipo",
            parseInt(id)
        );

        res.sendStatus(204);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};