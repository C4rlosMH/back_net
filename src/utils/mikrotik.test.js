import 'dotenv/config';
import { RouterOSAPI } from 'node-routeros';


// Configura las credenciales de tu router
const api = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASSWORD || ''
});

async function probarConexion() {
    try {
        //console.log('Intentando conectar al MikroTik...');
        
        // Iniciamos la conexión
        await api.connect();
        //console.log('Conexión exitosa al MikroTik.');

        // Le enviamos un comando básico: pedir la identidad del router
        const identity = await api.write('/system/identity/print');
        //console.log('El nombre de tu router es:', identity[0].name);

        // Cerramos la conexión para no dejar procesos colgados
        api.close();
    } catch (error) {
        console.error('Error al conectar con MikroTik:', error.message);
    }
}

probarConexion();