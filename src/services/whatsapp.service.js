import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// Usamos LocalAuth para que recuerde la sesión y no te pida el QR cada vez que reinicias el servidor
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

export const iniciarWhatsApp = () => {
    client.on('qr', (qr) => {
        console.log('\n--- ESCANEA ESTE QR CON EL WHATSAPP DE TU NEGOCIO ---');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        isReady = true;
        console.log('WhatsApp Bot conectado y listo para enviar notificaciones.');
    });

    client.on('auth_failure', msg => {
        console.error('Error de autenticación en WhatsApp:', msg);
    });

    client.initialize();
};

export const enviarMensajeWhatsApp = async (numero, mensaje) => {
    if (!isReady) {
        console.log('WhatsApp no está listo. Mensaje no enviado a:', numero);
        return false;
    }

    try {
        // Limpiamos el número para que solo tenga dígitos
        const numeroLimpio = numero.replace(/\D/g, '');
        
        // Formato para México (52) + número + @c.us (identificador de WhatsApp)
        const chatId = `52${numeroLimpio}@c.us`;
        
        await client.sendMessage(chatId, mensaje);
        return true;
    } catch (error) {
        console.error(`Error al enviar WhatsApp a ${numero}:`, error);
        return false;
    }
};