import 'dotenv/config';
import { RouterOSAPI } from 'node-routeros';

// Función auxiliar para generar la conexión
const getMikrotikApi = () => {
    return new RouterOSAPI({
        host: process.env.MIKROTIK_HOST,
        user: process.env.MIKROTIK_USER,
        password: process.env.MIKROTIK_PASSWORD
    });
};

export const suspenderClientePPPoE = async (nombreUsuario) => {
    const api = getMikrotikApi();
    try {
        await api.connect();
        
        const secrets = await api.write('/ppp/secret/print', [`?name=${nombreUsuario}`]);
        
        if (secrets.length === 0) {
            console.log(`[MikroTik] Usuario ${nombreUsuario} no encontrado para suspender.`);
            api.close();
            return false;
        }

        const idSecret = secrets[0]['.id'];

        // Deshabilitar el secret
        await api.write('/ppp/secret/set', [
            `=.id=${idSecret}`,
            '=disabled=yes' 
        ]);

        // Tirar la sesión activa para que el corte sea inmediato
        const sesionesActivas = await api.write('/ppp/active/print', [`?name=${nombreUsuario}`]);
        if (sesionesActivas.length > 0) {
            const idSesion = sesionesActivas[0]['.id'];
            await api.write('/ppp/active/remove', [`=.id=${idSesion}`]);
        }

        console.log(`[MikroTik] Cliente ${nombreUsuario} suspendido con éxito.`);
        api.close();
        return true;

    } catch (error) {
        console.error(`[MikroTik] Error al suspender a ${nombreUsuario}:`, error.message);
        return false;
    }
};

export const activarClientePPPoE = async (nombreUsuario) => {
    const api = getMikrotikApi();
    try {
        await api.connect();
        
        const secrets = await api.write('/ppp/secret/print', [`?name=${nombreUsuario}`]);
        
        if (secrets.length === 0) {
            console.log(`[MikroTik] Usuario ${nombreUsuario} no encontrado para activar.`);
            api.close();
            return false;
        }

        const idSecret = secrets[0]['.id'];

        // Habilitar el secret
        await api.write('/ppp/secret/set', [
            `=.id=${idSecret}`,
            '=disabled=no' 
        ]);

        console.log(`[MikroTik] Cliente ${nombreUsuario} activado con éxito.`);
        api.close();
        return true;

    } catch (error) {
        console.error(`[MikroTik] Error al activar a ${nombreUsuario}:`, error.message);
        return false;
    }
};