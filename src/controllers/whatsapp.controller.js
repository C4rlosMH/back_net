import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
import { 
    enviarNotificacion, 
    getWhatsAppStatus, 
    logoutWhatsApp, 
    iniciarWhatsApp 
} from "../services/whatsapp.service.js";

export const enviarMensajeManual = async (req, res) => {
    try {
        // CORRECCIÓN: Extraer la variable 'mensaje' que envía el frontend
        const { clienteId, tipo, mensaje } = req.body; 
        
        const clienteRepository = AppDataSource.getRepository(Cliente);
        const cliente = await clienteRepository.findOne({ 
            where: { id: clienteId },
            relations: ["plan"]
        });

        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

        // CORRECCIÓN: Pasar el 'mensaje' a la función
        const enviado = await enviarNotificacion(cliente, tipo, mensaje);

        if (enviado) {
            return res.json({ message: "Mensaje enviado con éxito" });
        } else {
            return res.status(500).json({ message: "El bot no está listo o el número de teléfono es inválido." });
        }

    } catch (error) {
        console.error("Error en enviarMensajeManual:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export const getStatus = (req, res) => {
    try {
        const status = getWhatsAppStatus(); 
        res.json(status);
    } catch (error) {
        console.error("Error al obtener estado:", error);
        res.status(500).json({ message: "Error al consultar estado de WhatsApp" });
    }
};

export const logout = async (req, res) => {
    try {
        await logoutWhatsApp();
        res.json({ message: "Sesión cerrada. Generando nuevo QR..." });
    } catch (error) {
        res.status(500).json({ message: "Error al cerrar sesión" });
    }
};

export const reiniciar = (req, res) => {
    iniciarWhatsApp();
    res.json({ message: "Reiniciando servicio de WhatsApp..." });
};