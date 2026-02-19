import { AppDataSource } from "../config/data-source.js";
import { Equipo } from "../entities/Equipo.js";
import { crearEquipoService, asignarEquiposService, deleteEquipoService } from "../services/equipo.service.js";
import { registrarLog } from "../services/log.service.js";

export const createEquipo = async (req, res) => {
    try {
        const equipo = await crearEquipoService(req.body);
        
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
        const equipoRepo = AppDataSource.getRepository(Equipo);
        const { estado, page = 1, limit = 12 } = req.query; 
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const whereCondition = estado && estado !== "TODOS" ? { estado } : {};

        const [equipos, total] = await equipoRepo.findAndCount({
            where: whereCondition,
            relations: ["cliente"],
            order: { id: "DESC" }, // CORRECCIÓN: Ordenar por 'id' ya que no existe 'createdAt'
            take: limitNum,
            skip: skip
        });

        res.json({
            equipos,
            total,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum
        });
    } catch (error) {
        console.error("Error en getInventario:", error);
        res.status(500).json({ message: "Error al obtener inventario" });
    }
};

export const deleteEquipo = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteEquipoService(id);
        
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