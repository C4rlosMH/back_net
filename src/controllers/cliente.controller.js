import { createClienteService, getClientesService } from "../services/cliente.service.js";

export const createCliente = async (req, res) => {
    try {
        const cliente = await createClienteService(req.body);
        res.status(201).json({
            message: "Cliente registrado exitosamente",
            data: cliente
        });
    } catch (error) {
        // Si es error de validación (caja llena), enviamos 400 (Bad Request)
        res.status(400).json({ 
            message: error.message 
        });
    }
};

export const getClientes = async (req, res) => {
    try {
        const clientes = await getClientesService();
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener clientes", error: error.message });
    }
};