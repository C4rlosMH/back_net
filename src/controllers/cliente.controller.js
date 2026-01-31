import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { Equipo } from "../entities/Equipo.js"; // Importamos Equipo para actualizarlo
import { In } from "typeorm"; // Para consultas "WHERE id IN (...)"

const clienteRepo = AppDataSource.getRepository(Cliente);
const equipoRepo = AppDataSource.getRepository(Equipo);

export const getClientes = async (req, res) => {
    try {
        // Traemos "equipos" (plural)
        const clientes = await clienteRepo.find({ relations: ["plan", "equipos", "caja"] });
        res.json(clientes);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createCliente = async (req, res) => {
    try {
        // Recibimos 'equiposIds' (Array de IDs) en lugar de 'equipoId'
        const { planId, equiposIds, cajaId, ...data } = req.body;

        const cliente = clienteRepo.create({
            ...data,
            plan: planId ? { id: planId } : null,
            caja: cajaId ? { id: cajaId } : null
            // No asignamos equipos aquí directamente, lo hacemos tras guardar
        });

        const savedCliente = await clienteRepo.save(cliente);

        // Si enviaron equipos, los actualizamos para que pertenezcan a este cliente
        if (equiposIds && equiposIds.length > 0) {
            await equipoRepo.update(
                { id: In(equiposIds) }, 
                { cliente: savedCliente, estado: "INSTALADO" }
            );
        }

        res.json(savedCliente);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { planId, equiposIds, cajaId, ...data } = req.body;

        const cliente = await clienteRepo.findOne({ 
            where: { id: parseInt(id) },
            relations: ["equipos"] 
        });

        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

        // 1. Actualizar datos básicos
        clienteRepo.merge(cliente, {
            ...data,
            plan: planId ? { id: planId } : null,
            caja: cajaId ? { id: cajaId } : null
        });
        await clienteRepo.save(cliente);

        // 2. Gestión de Equipos (Si se envía una nueva lista)
        if (equiposIds) {
            // A. Liberar equipos anteriores (ponerlos en ALMACEN y quitar cliente)
            if (cliente.equipos && cliente.equipos.length > 0) {
                const idsAnteriores = cliente.equipos.map(e => e.id);
                await equipoRepo.update(
                    { id: In(idsAnteriores) },
                    { cliente: null, estado: "ALMACEN" }
                );
            }

            // B. Asignar nuevos equipos
            if (equiposIds.length > 0) {
                await equipoRepo.update(
                    { id: In(equiposIds) },
                    { cliente: { id: parseInt(id) }, estado: "INSTALADO" }
                );
            }
        }

        res.json(cliente);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ... Las demás funciones (getCliente, deleteCliente) se mantienen igual, solo cambia relations: ["equipos"]
export const getCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const cliente = await clienteRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["plan", "equipos", "caja"]
        });
        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });
        res.json(cliente);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const deleteCliente = async (req, res) => {
    try {
        const { id } = req.params;
        // Al borrar cliente, TypeORM pondrá clienteId = null en los equipos (si está configurado SET NULL)
        // O podrías querer liberarlos manualmente antes.
        const result = await clienteRepo.delete({ id: parseInt(id) });
        if (result.affected === 0) return res.status(404).json({ message: "Cliente no encontrado" });
        return res.sendStatus(204);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};