import 'dotenv/config';
import { RouterOSAPI } from 'node-routeros';

// Configura las credenciales leyendo desde el archivo .env
const api = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASSWORD || ''
});

async function suspenderCliente(nombreUsuario) {
    try {
        console.log(`Conectando al MikroTik en ${process.env.MIKROTIK_HOST}...`);
        await api.connect();
        
        console.log(`Buscando al usuario: ${nombreUsuario}`);

        // PASO 1: Buscar el ID interno del secret del usuario
        const secrets = await api.write('/ppp/secret/print', [`?name=${nombreUsuario}`]);
        
        if (secrets.length === 0) {
            console.log('El usuario no existe en la lista de secrets.');
            api.close();
            return;
        }

        const idSecret = secrets[0]['.id'];

        // PASO 2: Deshabilitar el secret
        await api.write('/ppp/secret/set', [
            `=.id=${idSecret}`,
            '=disabled=yes' 
        ]);
        console.log('Secret deshabilitado con éxito. Ya no podrá autenticarse.');

        // PASO 3: Buscar si el cliente está conectado ahora mismo y tirarlo
        const sesionesActivas = await api.write('/ppp/active/print', [`?name=${nombreUsuario}`]);
        
        if (sesionesActivas.length > 0) {
            const idSesion = sesionesActivas[0]['.id'];
            await api.write('/ppp/active/remove', [`=.id=${idSesion}`]);
            console.log('Sesión activa eliminada. El corte ha sido inmediato.');
        } else {
            console.log('El cliente no estaba conectado en este momento.');
        }

        api.close();
        console.log('Proceso finalizado.');

    } catch (error) {
        console.error('Error de comunicación con MikroTik:', error.message);
    }
}

// Leer el argumento desde la terminal. Si no escribes nada, usará 'PRUEBA' por defecto.
const usuarioObjetivo = process.argv[2] || 'PRUEBA';
suspenderCliente(usuarioObjetivo);