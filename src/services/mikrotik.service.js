import 'dotenv/config';
import { RouterOSAPI } from 'node-routeros';

// Funcion auxiliar para generar la conexion
const getMikrotikApi = () => {
    return new RouterOSAPI({
        host: process.env.MIKROTIK_HOST,
        user: process.env.MIKROTIK_USER,
        password: process.env.MIKROTIK_PASSWORD || ''
    });
};

export const suspenderClientePPPoE = async (nombreUsuario) => {
    const api = getMikrotikApi();
    try {
        await api.connect();
        
        const secrets = await api.write('/ppp/secret/print', [`?name=${nombreUsuario}`]);
        
        if (secrets.length === 0) {
            api.close();
            return false;
        }

        const idSecret = secrets[0]['.id'];

        await api.write('/ppp/secret/set', [
            `=.id=${idSecret}`,
            '=disabled=yes' 
        ]);

        const sesionesActivas = await api.write('/ppp/active/print', [`?name=${nombreUsuario}`]);
        if (sesionesActivas.length > 0) {
            const idSesion = sesionesActivas[0]['.id'];
            await api.write('/ppp/active/remove', [`=.id=${idSesion}`]);
        }

        api.close();
        return true;

    } catch (error) {
        console.error('[MikroTik] Error de comunicacion durante la suspension.');
        return false;
    }
};

export const activarClientePPPoE = async (nombreUsuario) => {
    const api = getMikrotikApi();
    try {
        await api.connect();
        
        const secrets = await api.write('/ppp/secret/print', [`?name=${nombreUsuario}`]);
        
        if (secrets.length === 0) {
            api.close();
            return false;
        }

        const idSecret = secrets[0]['.id'];

        await api.write('/ppp/secret/set', [
            `=.id=${idSecret}`,
            '=disabled=no' 
        ]);

        api.close();
        return true;

    } catch (error) {
        console.error('[MikroTik] Error de comunicacion durante la activacion.');
        return false;
    }
};