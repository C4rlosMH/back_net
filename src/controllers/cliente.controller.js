import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";

const clienteRepo = AppDataSource.getRepository(Cliente);

export const getClientes = async (req, res) => {
    try {
        // Agregamos 'caja' a las relaciones para verla en la lista y mapa
        const clientes = await clienteRepo.find({ relations: ["plan", "equipo", "caja"] });
        res.json(clientes);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createCliente = async (req, res) => {
    try {
        // Extraemos cajaId del cuerpo de la petición
        const { planId, equipoId, cajaId, ...data } = req.body;

        const cliente = clienteRepo.create({
            ...data,
            plan: planId ? { id: planId } : null,
            equipo: equipoId ? { id: equipoId } : null,
            caja: cajaId ? { id: cajaId } : null // <--- GUARDAMOS LA CAJA
        });

        await clienteRepo.save(cliente);
        res.json(cliente);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { planId, equipoId, cajaId, ...data } = req.body; // Extraer cajaId

        const cliente = await clienteRepo.findOneBy({ id: parseInt(id) });
        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

        clienteRepo.merge(cliente, {
            ...data,
            plan: planId ? { id: planId } : null,
            // Nota: equipoId a veces requiere lógica extra si cambia, aquí lo simplificamos
            equipo: equipoId ? { id: equipoId } : null,
            caja: cajaId ? { id: cajaId } : null // <--- ACTUALIZAMOS LA CAJA
        });

        const updatedCliente = await clienteRepo.save(cliente);
        res.json(updatedCliente);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const cliente = await clienteRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["plan", "equipo", "caja"] // Incluir caja
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
        const result = await clienteRepo.delete({ id: parseInt(id) });
        if (result.affected === 0) return res.status(404).json({ message: "Cliente no encontrado" });
        return res.sendStatus(204);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};