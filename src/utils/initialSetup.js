import { AppDataSource } from "../config/data-source.js";
import { UserSistema } from "../entities/UserSistema.js";
import { encrypt } from "./handlePassword.js";

export const createAdminUser = async () => {
    try {
        const userRepo = AppDataSource.getRepository(UserSistema);

        // 1. Verificar si ya existen usuarios
        const count = await userRepo.count();
        if (count > 0) {
            // Si ya hay usuarios, no hacemos nada
            return;
        }

        // 2. Si no hay nadie, creamos al Super Admin
        const passwordHash = await encrypt("admin123");
        
        const superAdmin = userRepo.create({
            nombre: "Super Admin",
            username: "admin",
            password: passwordHash,
            rol: "ADMIN",
            activo: true
        });

        await userRepo.save(superAdmin);
        
        console.log("¡Usuario ADMIN inicial creado automáticamente!");
        console.log("Usuario: admin");
        console.log("Password: admin123");

    } catch (error) {
        console.error("Error en el setup inicial:", error);
    }
};