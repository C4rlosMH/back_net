import { AppDataSource } from "../config/data-source.js";
import { UserSistema } from "../entities/UserSistema.js";
import { encrypt, compare } from "../utils/handlePassword.js";
import jwt from "jsonwebtoken";

const userRepo = AppDataSource.getRepository(UserSistema);

// Registro de usuario (Para crear admins/técnicos)
export const registerUserService = async (userData) => {
    // 1. Verificar si el usuario ya existe
    const exists = await userRepo.findOne({ where: { username: userData.username } });
    if (exists) throw new Error("El nombre de usuario ya está en uso");

    // 2. Encriptar contraseña
    const passwordHash = await encrypt(userData.password);
    
    // 3. Guardar usuario
    const newUser = userRepo.create({
        ...userData,
        password: passwordHash
    });
    
    return await userRepo.save(newUser);
};

// Login de usuario
export const loginService = async ({ username, password }) => {
    const user = await userRepo.findOne({ where: { username } });
    
    if (!user) throw new Error("Usuario no encontrado");
    if (!user.activo) throw new Error("Usuario desactivado. Contacte al administrador.");

    // Verificar contraseña
    const isCorrect = await compare(password, user.password);
    if (!isCorrect) throw new Error("Contraseña incorrecta");

    // Generar Token JWT (payload seguro)
    const tokenPayload = {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: "8h" // Expira en 8 horas
    });

    return {
        user: tokenPayload,
        token
    };
};

// Cambio de Contraseña (Protegido)
export const changePasswordService = async (userId, currentPassword, newPassword) => {
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error("Usuario no encontrado");

    // 1. Validar que la contraseña actual sea correcta (Seguridad)
    const isCorrect = await compare(currentPassword, user.password);
    if (!isCorrect) throw new Error("La contraseña actual es incorrecta");

    // 2. Encriptar la nueva contraseña
    const newHash = await encrypt(newPassword);
    
    // 3. Guardar la nueva contraseña
    user.password = newHash;
    await userRepo.save(user);

    return { message: "Contraseña actualizada correctamente" };
};