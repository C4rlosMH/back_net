import { AppDataSource } from "../data-source";
import { SystemLog } from "../entity/SystemLog";
import { User } from "../entity/Auth";

export class Logger {
    static log = async (userId: number, action: string, module: string, details: string) => {
        try {
            const logRepo = AppDataSource.getRepository(SystemLog);
            const log = new SystemLog();
            
            log.action = action;
            log.module = module;
            log.details = details;
            
            // Asignamos el usuario solo con el ID (sin buscarlo en BD para ahorrar recursos)
            log.user = { id: userId } as User; 

            await logRepo.save(log);
        } catch (error) {
            console.error("Error al guardar log:", error);
            // No detenemos el sistema si falla el log, solo avisamos en consola
        }
    };
}