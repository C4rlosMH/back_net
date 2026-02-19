import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

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
        //console.log('Nuevo QR generado. Ve al Panel de Control > Conexión WhatsApp para escanearlo.');
        qrCodeData = qr;
        connectionStatus = 'QR_READY';
    });

    client.on('ready', () => {
        console.log('WhatsApp Bot conectado exitosamente.');
        connectionStatus = 'READY';
        qrCodeData = null;
    });

    client.on('auth_failure', msg => {
        console.error('Error de autenticación en WhatsApp:', msg);
        connectionStatus = 'auth_failure';
    });

    client.on('disconnected', async (reason) => {
        console.log('WhatsApp fue desconectado:', reason);
        connectionStatus = 'DISCONNECTED';
        qrCodeData = null;
        if (client) await client.destroy();
        client = null;
        iniciarWhatsApp();
    });

    return client;
};

export const iniciarWhatsApp = () => {
    if (!client) {
        connectionStatus = 'INITIALIZING';
        createClient();
        client.initialize();
    }
};

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
    if (connectionStatus !== 'READY' || !client) {
        //console.log("No se pudo enviar: WhatsApp no está conectado.");
        return false;
    }
    
    try {
        let numeroLimpio = String(numero).replace(/\D/g, '');
        
        if (!numeroLimpio.startsWith('52')) {
             numeroLimpio = '52' + numeroLimpio;
        }
        
        const registeredNumber = await client.getNumberId(numeroLimpio);
        
        if (!registeredNumber) {
            console.error(`El número ${numeroLimpio} no está registrado en WhatsApp.`);
            return false;
        }

        await client.sendMessage(registeredNumber._serialized, mensaje);
        return true;
    } catch (error) {
        console.error(`Error interno al enviar WhatsApp a ${numero}:`, error);
        return false;
    }
};

// --- TEMPLATES ACTUALIZADOS ---
const getMensajeTemplate = (tipo, cliente) => {
    const nombre = cliente.nombre_completo.split(" ")[0];
    const montoMes = cliente.plan ? Number(cliente.plan.precio_mensual).toFixed(2) : "0.00";
    const deudaTotal = (Number(cliente.saldo_actual || 0) + Number(cliente.saldo_aplazado || 0)).toFixed(2);
    
    switch (tipo) {
        case 'ANTICIPADO': 
            return `Hola ${nombre}, recordatorio: Tu fecha de pago por la cantidad de *$${montoMes}* está próxima.`;
        case 'RECORDATORIO': 
            return `Hola ${nombre}, hoy es tu día de pago por la cantidad de *$${montoMes}*. Favor de enviar comprobante.`;
        case 'SUSPENSION': 
            return `Hola ${nombre}, tu pago de *$${montoMes}* está vencido. Evita la suspensión.`;
        case 'AGRADECIMIENTO': 
            return `Gracias ${nombre}, hemos recibido tu pago de *$${montoMes}*.`;
        case 'ADEUDO': 
            return `Hola ${nombre}. Usted cuenta con un adeudo total de *$${deudaTotal}*. Le invitamos a saldar su cuenta para evitar la suspensión del servicio.`;
        default: 
            return `Hola ${nombre}.`;
    }
};

export const enviarNotificacion = async (cliente, tipo, customText = "") => {
    if (!cliente.telefono) return false;
    
    const mensaje = tipo === 'CUSTOM' ? customText : getMensajeTemplate(tipo, cliente);
    
    return await enviarMensajeWhatsApp(cliente.telefono, mensaje);
};