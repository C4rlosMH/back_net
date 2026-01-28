import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/Auth"; // Reutilizamos la entidad User
import bcrypt from "bcryptjs";

export class UserController {

    // ESTO ANTES ERA "REGISTER" EN AUTH, AHORA ES "CREATE" AQUÍ
    static create = async (req: Request, res: Response) => {
        const { username, password, name, role } = req.body;

        if (!username || !password || !name) {
             res.status(400).json({ message: "Faltan datos requeridos" });
             return;
        }

        const userRepo = AppDataSource.getRepository(User);
        const exists = await userRepo.findOneBy({ username });
        if (exists) {
             res.status(409).json({ message: "El usuario ya existe" });
             return;
        }

        const user = new User();
        user.username = username;
        user.name = name;
        user.role = role || "TECNICO";
        user.password = await bcrypt.hash(password, 10);

        try {
            await userRepo.save(user);
            res.status(201).json({ message: "Usuario creado por Admin" });
        } catch (error) {
            res.status(500).json({ message: "Error al crear usuario" });
        }
    };

    static getAll = async (req: Request, res: Response) => {
        const userRepo = AppDataSource.getRepository(User);
        const users = await userRepo.find({
            select: ["id", "username", "name", "role", "createdAt"] // Sin password
        });
        res.json(users);
    };

    static getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const userRepo = AppDataSource.getRepository(User);
        try {
            const user = await userRepo.findOne({
                where: { id: parseInt(id as string) },
                select: ["id", "username", "name", "role", "createdAt"]
            });
            if (user) res.json(user);
            else res.status(404).json({ message: "No encontrado" });
        } catch (error) {
            res.status(500).json({ message: "Error" });
        }
    };

    // EL ADMIN RESETEA LA CLAVE SI ALGUIEN LA OLVIDA
    static resetPassword = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
             res.status(400).json({ message: "Falta la nueva contraseña" });
             return;
        }

        const userRepo = AppDataSource.getRepository(User);
        try {
            const user = await userRepo.findOneBy({ id: parseInt(id as string) });
            if (!user) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return;
            }

            user.password = await bcrypt.hash(newPassword, 10);
            await userRepo.save(user);

            res.json({ message: `Contraseña de ${user.username} reseteada` });
        } catch (error) {
            res.status(500).json({ message: "Error al resetear" });
        }
    };
    
    // Aquí puedes agregar update y delete si los necesitas
    static delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const userRepo = AppDataSource.getRepository(User);
        try {
            await userRepo.delete(id);
            res.json({ message: "Usuario eliminado" });
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar" });
        }
    };
}