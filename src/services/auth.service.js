import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source.js";
import { UserSistema } from "../entities/UserSistema.js";
import { Cliente } from "../entities/Cliente.js";

// =======================================================
// SERVICIOS PARA USUARIOS DEL SISTEMA (ADMINISTRADORES)
// =======================================================

export const registerUserService = async ({ username, password, email }) => {
    const userRepo = AppDataSource.getRepository(UserSistema);
    
    const existingUser = await userRepo.findOne({ where: { username } });
    if (existingUser) throw new Error("El usuario ya existe en el sistema.");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = userRepo.create({
        username,
        email,
        password: hashedPassword
        // Eliminamos la asignacion del rol aqui
    });

    await userRepo.save(newUser);
    return newUser;
};

export const loginService = async ({ username, password }) => {
    const userRepo = AppDataSource.getRepository(UserSistema);
    
    // Eliminamos 'role' del select
    const user = await userRepo.findOne({
        where: { username },
        select: ["id", "username", "password"] 
    });

    if (!user) throw new Error("Credenciales incorrectas.");

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error("Credenciales incorrectas.");

    // Al generar el token, le asignamos el rol "ADMIN" por defecto
    // ya que sabemos que viene de la tabla UserSistema
    const token = jwt.sign(
        { 
            id: user.id, 
            rol: "ADMIN", 
            username: user.username 
        },
        process.env.JWT_SECRET || "secreto_desarrollo",
        { expiresIn: "24h" }
    );

    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            role: "ADMIN" // Lo enviamos al front para que tu contexto de React lo lea
        }
    };
};

export const changePasswordService = async (userId, currentPassword, newPassword) => {
    // ... (Este se queda igual, no tenia el campo role)
    const userRepo = AppDataSource.getRepository(UserSistema);
    
    const user = await userRepo.findOne({
        where: { id: userId },
        select: ["id", "password"]
    });

    if (!user) throw new Error("Administrador no encontrado.");

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) throw new Error("La contrasena actual es incorrecta.");

    if (newPassword.length < 6) {
        throw new Error("La nueva contrasena debe tener al menos 6 caracteres.");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await userRepo.save(user);

    return { message: "Contrasena de administrador actualizada correctamente." };
};

// =======================================================
// SERVICIOS PARA CLIENTES (PORTAL)
// =======================================================

export const loginClienteService = async ({ numero_suscriptor, password }) => {
    if (!numero_suscriptor || !password) {
        throw new Error("El numero de suscriptor y la contrasena son obligatorios.");
    }

    const clienteRepo = AppDataSource.getRepository(Cliente);

    // Se extraen los campos necesarios, incluyendo el password que está protegido en la entidad
    const cliente = await clienteRepo.findOne({
        where: { numero_suscriptor },
        select: ["id", "numero_suscriptor", "password", "requiere_cambio_password", "nombre_completo", "estado"]
    });

    if (!cliente) {
        throw new Error("Credenciales incorrectas.");
    }

    const isPasswordValid = await bcrypt.compare(password, cliente.password);
    if (!isPasswordValid) {
        throw new Error("Credenciales incorrectas.");
    }

    // Validación extra: no permitir el inicio de sesión si el cliente está dado de baja
    if (cliente.estado === "BAJA") {
        throw new Error("El acceso para esta cuenta ha sido deshabilitado.");
    }

    // Generar el Token JWT firmado para el cliente
    const token = jwt.sign(
        { 
            id: cliente.id, 
            rol: "CLIENTE",
            numero_suscriptor: cliente.numero_suscriptor 
        },
        process.env.JWT_SECRET || "secreto_desarrollo", 
        { expiresIn: "24h" }
    );

    return {
        token,
        cliente: {
            id: cliente.id,
            nombre_completo: cliente.nombre_completo,
            numero_suscriptor: cliente.numero_suscriptor,
            requiere_cambio_password: cliente.requiere_cambio_password,
            estado: cliente.estado
        }
    };
};

export const changePasswordClienteService = async (clienteId, newPassword) => {
    if (!newPassword || newPassword.length < 6) {
        throw new Error("La nueva contrasena debe tener al menos 6 caracteres.");
    }

    const clienteRepo = AppDataSource.getRepository(Cliente);
    
    const cliente = await clienteRepo.findOne({ where: { id: clienteId } });
    if (!cliente) {
        throw new Error("Cliente no encontrado.");
    }

    // Encriptar la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar datos
    cliente.password = hashedPassword;
    cliente.requiere_cambio_password = false;

    await clienteRepo.save(cliente);

    return { message: "Contrasena actualizada correctamente. Ya puedes acceder al portal." };
};