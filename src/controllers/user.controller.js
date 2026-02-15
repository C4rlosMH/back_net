import { registerUserService } from "../services/auth.service.js";
import { AppDataSource } from "../config/data-source.js";
import { UserSistema } from "../entities/UserSistema.js";
import { registrarLog } from "../services/log.service.js"; // <--- Importamos el servicio
import { encrypt } from "../utils/handlePassword.js";

const userRepo = AppDataSource.getRepository(UserSistema);

// Crear Usuario (SOLO ADMIN)
export const createUser = async (req, res) => {
    try {
        // Reutilizamos la logica de encriptacion
        const user = await registerUserService(req.body);
        
        // No devolvemos la password
        const { password, ...userWithoutPassword } = user;
        
        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador", 
            "CREAR_USUARIO",
            `Se creo un nuevo usuario del sistema: ${userWithoutPassword.username} (${userWithoutPassword.rol})`,
            "UserSistema",
            userWithoutPassword.id
        );

        res.status(201).json({ 
            message: "Usuario creado exitosamente por Admin", 
            user: userWithoutPassword 
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Listar Usuarios (SOLO ADMIN)
export const getUsers = async (req, res) => {
    try {
        const users = await userRepo.find({
            select: ["id", "nombre", "username", "rol", "activo", "createdAt"] // No traemos password
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener usuarios" });
    }
};

// Desactivar/Activar Usuario (SOLO ADMIN)
export const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userRepo.findOne({ where: { id: Number(id) } });

        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
        
        // No te puedes desactivar a ti mismo
        if (user.id === req.user.id) {
            return res.status(400).json({ message: "No puedes desactivar tu propia cuenta." });
        }

        user.activo = !user.activo;
        await userRepo.save(user);

        // --- REGISTRO DE LOG ---
        registrarLog(
            req.user?.username || "Administrador",
            "ESTADO_USUARIO",
            `Se ${user.activo ? 'activo' : 'desactivo'} el acceso del usuario: ${user.username}`,
            "UserSistema",
            user.id
        );

        res.json({ 
            message: `Usuario ${user.activo ? 'activado' : 'desactivado'} correctamente`, 
            activo: user.activo 
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const adminResetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
        }

        const user = await userRepo.findOne({ where: { id: Number(id) } });
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        // Encriptar y guardar la nueva contraseña
        const passwordHash = await encrypt(newPassword);
        user.password = passwordHash;
        await userRepo.save(user);

        // Registrar en la bitácora
        registrarLog(
            req.user?.username || "Administrador",
            "RESET_PASSWORD",
            `El administrador forzó el cambio de contraseña del usuario: ${user.username}`,
            "UserSistema",
            user.id
        );

        res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};