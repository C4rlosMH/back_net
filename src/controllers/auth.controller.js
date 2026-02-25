import { registerUserService, loginService, changePasswordService, loginClienteService, changePasswordClienteService } from "../services/auth.service.js";
import { registrarLog, registrarLogCliente } from "../services/log.service.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { Cliente } from '../entities/Cliente.js';
import { AppDataSource } from '../config/data-source.js';

// --- CONFIGURACIÓN DE NODEMAILER ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, // true para puerto 465 (SSL)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

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

// --- CONTROLADORES PARA CLIENTES ---
export const loginCliente = async (req, res) => {
    try {
        const data = await loginClienteService(req.body);
        
        // Extraemos 'cliente' del objeto 'data' que devuelve el servicio
        const cliente = data.cliente;
        
        registrarLogCliente(
            cliente.numero_suscriptor, 
            "LOGIN_PORTAL_CLIENTE",
            "Inicio de sesion exitoso en el portal de clientes",
            cliente.id
        );

        res.json(data);
    } catch (error) {
        // Si falla el login, capturamos el numero de suscriptor que intentó ingresar desde req.body
        const numeroIntentado = req.body.numero_suscriptor || "Usuario Desconocido";

        registrarLogCliente(
            numeroIntentado, 
            "LOGIN_PORTAL_CLIENTE_FALLIDO",
            "Intento de inicio de sesion fallido",
            null // Pasamos null porque no hay ID de cliente válido
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

// --- RECUPERACIÓN DE CONTRASEÑA (CLIENTES) ---

export const solicitarRecuperacion = async (req, res) => {
    try {
        const { suscriptor } = req.body;
        const clienteRepository = AppDataSource.getRepository(Cliente);
        
        const cliente = await clienteRepository.findOne({ where: { numero_suscriptor: suscriptor } });

        if (!cliente) {
            // Por seguridad, siempre devolvemos éxito aunque no exista, para no revelar si un usuario existe o no
            return res.json({ message: "Si el suscriptor existe, se enviaron instrucciones." });
        }

        if (!cliente.email) {
            // Retornamos un código específico para que el frontend muestre el botón de WhatsApp
            return res.status(400).json({ 
                code: 'NO_EMAIL',
                message: "No tienes un correo electronico vinculado a tu cuenta para realizar este proceso." 
            });
        }

        // Generar un token válido por 15 minutos
        const resetToken = jwt.sign(
            { id: cliente.id }, 
            process.env.JWT_SECRET || 'secreto_super_seguro', 
            { expiresIn: '15m' }
        );

        // Crear el enlace (apunta a la URL de tu frontend React)
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        // Enviar el correo
        await transporter.sendMail({
            from: `"Miranda Net" <${process.env.SMTP_USER}>`,
            to: cliente.email,
            subject: "Recuperacion de contrasena - Miranda Net",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a;">
                    <h2 style="color: #1d4ed8;">Recuperacion de contrasena</h2>
                    <p>Hola ${cliente.nombre_completo},</p>
                    <p>Hemos recibido una solicitud para restablecer la contrasena de tu portal. Si no fuiste tu, ignora este correo.</p>
                    <p>Para crear una nueva contrasena, haz clic en el siguiente boton (valido por 15 minutos):</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Restablecer contrasena</a>
                    <p>Saludos,<br>El equipo de Miranda Net</p>
                </div>
            `
        });

        // Registrar en el log
        registrarLogCliente(
            cliente.numero_suscriptor,
            "SOLICITUD_RECUPERACION",
            "El cliente solicito recuperacion de contrasena por correo.",
            cliente.id
        );

        res.json({ message: "Instrucciones enviadas al correo." });
    } catch (error) {
        console.error("Error en solicitar recuperacion:", error);
        res.status(500).json({ message: "Hubo un error al procesar la solicitud." });
    }
};

export const restablecerPassword = async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;

        if (!token || !nuevaPassword) {
            return res.status(400).json({ message: "Datos incompletos." });
        }

        // Verificar si el token es válido y no ha expirado
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_super_seguro');
        
        const clienteRepository = AppDataSource.getRepository(Cliente);
        const cliente = await clienteRepository.findOne({ where: { id: decoded.id } });

        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado." });
        }

        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

        // Actualizar en BD
        cliente.password = hashedPassword;
        await clienteRepository.save(cliente);

        // Registrar en el log
        registrarLogCliente(
            cliente.numero_suscriptor,
            "PASSWORD_RESTABLECIDA",
            "El cliente restablecio su contrasena mediante correo electronico.",
            cliente.id
        );

        res.json({ message: "Contrasena actualizada con exito." });
    } catch (error) {
        // Si el token expiró o es inválido
        res.status(400).json({ message: "El enlace es invalido o ha expirado. Solicita uno nuevo." });
    }
};