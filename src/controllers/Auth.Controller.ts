import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/Auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // <--- Importamos esto

export class UserController {

    static register = async (req: Request, res: Response) => {
        const { username, password, name, role } = req.body;

        if (!username || !password || !name) {
             res.status(400).json({ message: "Faltan datos obligatorios" });
             return; 
        }

        const userRepository = AppDataSource.getRepository(User);
        const userExist = await userRepository.findOneBy({ username });

        if (userExist) {
             res.status(409).json({ message: "El usuario ya existe" });
             return; 
        }

        const user = new User();
        user.username = username;
        user.name = name;
        user.role = role || 'TECNICO';
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        try {
            await userRepository.save(user);
            res.status(201).json({ message: "Usuario creado exitosamente" });
        } catch (error) {
            res.status(500).json({ message: "Error al guardar usuario" });
        }
    };

    // --- 2. LOGIN (Ya lo tenías) ---
    static login = async (req: Request, res: Response) => {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ message: "Usuario y contraseña requeridos" });
            return; 
        }

        const userRepository = AppDataSource.getRepository(User);
        let user: User | null;
        try {
            user = await userRepository.findOneBy({ username });
        } catch (error) {
            res.status(500).json({ message: "Error interno" });
            return; 
        }

        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ message: "Credenciales incorrectas" });
            return; 
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'secreto',
            { expiresIn: '8h' }
        );

        res.json({ message: "Login exitoso", token });
    };

    // --- 3. OBTENER TODOS (Nuevo) ---
    static getAll = async (req: Request, res: Response) => {
        const userRepository = AppDataSource.getRepository(User);
        try {
            const users = await userRepository.find({
                select: ["id", "username", "name", "role", "createdAt"] // ¡No devolvemos la contraseña!
            });
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener usuarios" });
        }
    };

    // --- 4. OBTENER UNO POR ID (Nuevo) ---
    static getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const userRepository = AppDataSource.getRepository(User);
        try {
            const user = await userRepository.findOne({
                where: { id: parseInt(id as string) },
                select: ["id", "username", "name", "role", "createdAt"]
            });

            if (!user) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return; 
            }
            res.json(user);
        } catch (error) {
            res.status(404).json({ message: "Usuario no encontrado" });
        }
    };
    // --- 5. EDITAR (Nuevo) ---
    static update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name, role } = req.body;
        const userRepository = AppDataSource.getRepository(User);

        try {
            let user = await userRepository.findOneBy({ id: parseInt(id as string) });
            if (!user) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return; 
            }

            // Solo actualizamos si envían el dato
            user.name = name || user.name;
            user.role = role || user.role;

            await userRepository.save(user);
            res.json({ message: "Usuario actualizado", user });
        } catch (error) {
            res.status(500).json({ message: "Error al actualizar" });
        }
    };

    // --- 6. ELIMINAR (Nuevo) ---
    static delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const userRepository = AppDataSource.getRepository(User);

        try {
            const result = await userRepository.delete(id);
            if (result.affected === 0) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return; 
            }
            res.status(200).json({ message: "Usuario eliminado" });
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar" });
        }
    };

}