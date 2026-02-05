import { 
    generarCargoMensualService, 
    registrarPagoService, 
    getHistorialPagosService,
    getMovimientosGlobalesService // <--- ¡AGREGA ESTO!
} from "../services/pago.service.js";

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
        const resultado = await registrarPagoService(req.body);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getHistorial = async (req, res) => {
    try {
        const { id } = req.params;
        const historial = await getHistorialPagosService(id);
        res.json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPagosGlobales = async (req, res) => {
    try {
        // Ahora sí funcionará porque la importamos arriba
        const historial = await getMovimientosGlobalesService();
        res.json(historial);
    } catch (error) {
        // Aquí es donde caía el error "getMovimientosGlobalesService is not defined"
        res.status(500).json({ message: error.message });
    }
};