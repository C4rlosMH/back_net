import 'dotenv/config';
import { RouterOSAPI } from 'node-routeros';

// Configura las credenciales leyendo desde el archivo .env
const api = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASSWORD || ''
});

async function activarCliente(nombreUsuario) {
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

        // PASO 2: Habilitar el secret para que el modem pueda volver a conectarse
        await api.write('/ppp/secret/set', [
            `=.id=${idSecret}`,
            '=disabled=no' 
        ]);
        console.log('Secret habilitado con exito. El cliente ya tiene acceso a internet.');

        // Nota: Omitimos el paso 3 (tirar sesion) porque un cliente deshabilitado 
        // no tiene una sesion activa en el MikroTik. Al habilitarlo, su modem 
        // reintentara la conexion por si solo en unos segundos.

        api.close();
        console.log('Proceso finalizado.');

    } catch (error) {
        console.error('Error de comunicacion con MikroTik:', error.message);
    }
}

// Leer el argumento desde la terminal. Si no escribes nada, usara 'PRUEBA' por defecto.
const usuarioObjetivo = process.argv[2] || 'PRUEBA';
activarCliente(usuarioObjetivo);