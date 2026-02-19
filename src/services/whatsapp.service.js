import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let qrCodeData = null;
let connectionStatus = 'DISCONNECTED'; // INITIALIZING, QR_READY, READY, DISCONNECTED
let client = null;

const createClient = () => {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        //console.log('Nuevo QR generado. Escanéalo en la App.');
        qrCodeData = qr;
        connectionStatus = 'QR_READY';
        //qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        //console.log('WhatsApp Bot conectado exitosamente.');
        connectionStatus = 'READY';
        qrCodeData = null;
    });

    client.on('auth_failure', msg => {
        console.error('Error de autenticación en WhatsApp:', msg);
        connectionStatus = 'auth_failure';
    });

    client.on('disconnected', async (reason) => {
        //console.log('WhatsApp fue desconectado:', reason);
        connectionStatus = 'DISCONNECTED';
        qrCodeData = null;
        await client.destroy();
        client = null;
        iniciarWhatsApp();
    });

    return client;
};

// --- FUNCIONES EXPORTADAS ---

export const iniciarWhatsApp = () => {
    if (!client) {
        connectionStatus = 'INITIALIZING';
        createClient();
        client.initialize();
    }
};

// ESTA ES LA FUNCIÓN QUE TE FALTABA O DABA ERROR
export const getWhatsAppStatus = () => {
    return {
        status: connectionStatus,
        qr: qrCodeData
    };
};

export const logoutWhatsApp = async () => {
    if (client && connectionStatus === 'READY') {
        await client.logout();
        connectionStatus = 'DISCONNECTED';
        qrCodeData = null;
        return true;
    }
    return false;
};

export const enviarMensajeWhatsApp = async (numero, mensaje) => {
    if (connectionStatus !== 'READY' || !client) return false;
    try {
        const numeroLimpio = numero.replace(/\D/g, '');
        const chatId = `52${numeroLimpio}@c.us`;
        await client.sendMessage(chatId, mensaje);
        return true;
    } catch (error) {
        console.error(`Error al enviar WhatsApp a ${numero}:`, error);
        return false;
    }
};

const getMensajeTemplate = (tipo, cliente) => {
    const nombre = cliente.nombre_completo.split(" ")[0];
    const plan = cliente.plan ? cliente.plan.nombre : "Servicio Internet";
    switch (tipo) {
        case 'ANTICIPADO': return `👋 Hola ${nombre}, recordatorio: Tu fecha de pago del servicio *${plan}* está próxima.`;
        case 'RECORDATORIO': return `📅 Hola ${nombre}, hoy es tu día de pago del servicio *${plan}*.`;
        case 'SUSPENSION': return `⚠️ Hola ${nombre}, tu pago del servicio *${plan}* está vencido.`;
        case 'AGRADECIMIENTO': return `🎉 Gracias ${nombre}, pago recibido para el servicio *${plan}*.`;
        default: return `Hola ${nombre}.`;
    }
};

export const enviarNotificacion = async (cliente, tipo) => {
    if (!cliente.telefono) return false;
    const mensaje = getMensajeTemplate(tipo, cliente);
    return await enviarMensajeWhatsApp(cliente.telefono, mensaje);
};