import { generarCargoMensualService, registrarPagoService, getHistorialPagosService } from "../services/pago.service.js";

export const generarCargo = async (req, res) => {
    try {
        const { clienteId } = req.body;
        const resultado = await generarCargoMensualService(clienteId);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const registrarPago = async (req, res) => {
    try {
        // Esperamos: { clienteId: 1, monto: 300, metodo_pago: "EFECTIVO" }
        const resultado = await registrarPagoService(req.body);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getHistorial = async (req, res) => {
    try {
        const { id } = req.params; // Viene de la URL /api/pagos/historial/:id
        const historial = await getHistorialPagosService(id);
        res.json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};