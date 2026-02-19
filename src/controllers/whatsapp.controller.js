import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entities/Cliente.js";
// IMPORTANTE: Aquí importamos la función que estaba fallando
import { 
    enviarNotificacion, 
    getWhatsAppStatus, 
    logoutWhatsApp, 
    iniciarWhatsApp 
} from "../services/whatsapp.service.js";

export const enviarMensajeManual = async (req, res) => {
    try {
        const { clienteId, tipo } = req.body;
        
        const clienteRepository = AppDataSource.getRepository(Cliente);
        const cliente = await clienteRepository.findOne({ 
            where: { id: clienteId },
            relations: ["plan"]
        });

        if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

        const enviado = await enviarNotificacion(cliente, tipo);

        if (enviado) {
            return res.json({ message: "Mensaje enviado con éxito" });
        } else {
            return res.status(500).json({ message: "El bot de WhatsApp no está listo o falló el envío." });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// --- MÉTODOS PARA GESTIÓN DE LA CONEXIÓN (QR) ---

export const getStatus = (req, res) => {
    try {
        // Esta es la línea que daba error. Ahora funcionará gracias al import de arriba.
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