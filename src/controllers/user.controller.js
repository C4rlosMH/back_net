import { registerUserService } from "../services/auth.service.js";
import { AppDataSource } from "../config/data-source.js";
import { UserSistema } from "../entities/UserSistema.js";

const userRepo = AppDataSource.getRepository(UserSistema);

// Crear Usuario (SOLO ADMIN)
export const createUser = async (req, res) => {
    try {
        // Aquí reutilizamos la lógica de encriptación que ya creamos
        const user = await registerUserService(req.body);
        
        // No devolvemos la password
        const { password, ...userWithoutPassword } = user;
        
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

        res.json({ 
            message: `Usuario ${user.activo ? 'activado' : 'desactivado'} correctamente`, 
            activo: user.activo 
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};