import { registerUserService, loginService, changePasswordService, loginClienteService, changePasswordClienteService } from "../services/auth.service.js";
import { registrarLog, registrarLogCliente } from "../services/log.service.js"; // <--- Importación

export const register = async (req, res) => {
    try {
        const user = await registerUserService(req.body);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            "Sistema", 
            "NUEVO_USUARIO",
            `Se registro un nuevo administrador en el sistema: ${user.username}`,
            "UserSistema",
            user.id
        );

        res.status(201).json({ message: "Usuario creado", user: user.username });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const data = await loginService(req.body);
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.body.username, // Quien intenta iniciar sesión
            "LOGIN",
            "Inicio de sesion exitoso",
            "UserSistema",
            null
        );

        res.json(data);
    } catch (error) {
        // Opcional: Registrar intentos fallidos de sesión por seguridad
        registrarLog(
            req.body.username,
            "LOGIN_FALLIDO",
            "Intento de inicio de sesion fallido (Credenciales incorrectas)",
            "UserSistema",
            null
        );

        res.status(401).json({ message: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { id, username } = req.user; 
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Debes enviar la contrasena actual y la nueva." });
        }

        const result = await changePasswordService(id, currentPassword, newPassword);

        // --- REGISTRO DE LOG ---
        registrarLog(
            username,
            "CAMBIO_PASSWORD",
            "El usuario actualizo su contrasena de acceso",
            "UserSistema",
            id
        );

        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- NUEVO CONTROLADOR PARA CLIENTES ---
export const loginCliente = async (req, res) => {
    try {
        const data = await loginClienteService(req.body);
        
        registrarLogCliente(
            req.body.numero_suscriptor, 
            "LOGIN_PORTAL_CLIENTE",
            "Inicio de sesion exitoso en el portal de clientes",
            "Cliente",
            data.cliente.id
        );

        res.json(data);
    } catch (error) {
        registrarLogCliente(
            req.body.numero_suscriptor,
            "LOGIN_FALLIDO_PORTAL_CLIENTE",
            "Intento de inicio de sesion fallido en portal (Credenciales incorrectas)",
            "Cliente",
            null
        );

        res.status(401).json({ message: error.message });
    }
};

export const changePasswordCliente = async (req, res) => {
    try {
        // req.user trae los datos del token decodificado (id, rol, numero_suscriptor)
        const { id, numero_suscriptor } = req.user; 
        const { newPassword } = req.body;

        const result = await changePasswordClienteService(id, newPassword);

        // --- REGISTRO DE LOG ---
        registrarLogCliente(
            numero_suscriptor,
            "CAMBIO_PASSWORD_CLIENTE",
            "El cliente configuro su contrasena personal por primera vez",
            "Cliente",
            id
        );

        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};