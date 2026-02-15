import { 
    generarCargoMensualService, 
    registrarPagoService, 
    getHistorialPagosService,
    getMovimientosGlobalesService 
} from "../services/pago.service.js";
import { registrarLog } from "../services/log.service.js"; // <--- Importación

export const generarCargo = async (req, res) => {
    try {
        const { clienteId } = req.body;
        const resultado = await generarCargoMensualService(clienteId);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Sistema",
            "GENERAR_CARGO",
            `Se genero un cargo mensual para el cliente ID: ${clienteId}`,
            "MovimientoFinanciero",
            resultado.id
        );

        res.json(resultado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const registrarPago = async (req, res) => {
    try {
        const resultado = await registrarPagoService(req.body);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "REGISTRAR_PAGO",
            `Se registro un pago/abono de $${req.body.monto} al cliente ID: ${req.body.clienteId} (${req.body.tipo_pago})`,
            "MovimientoFinanciero",
            resultado.id
        );

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
        const historial = await getMovimientosGlobalesService();
        res.json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};