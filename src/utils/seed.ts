import { AppDataSource } from "../data-source";
import { User } from "../entity/Auth";
import bcrypt from "bcryptjs";

export const seedDatabase = async () => {
    try {
        const userRepo = AppDataSource.getRepository(User);
        
        // Verificar si ya existen usuarios
        const count = await userRepo.count();

        if (count === 0) {
            
            const admin = new User();
            admin.username = "admin";
            admin.name = "Administrador";
            admin.role = "ADMIN";
            // Encriptamos la contraseña
            admin.password = await bcrypt.hash("123qwe987", 10); 

            await userRepo.save(admin);
        } else {
        }
    } catch (error) {
        console.error("Error en el seed de la base de datos:", error);
    }
};