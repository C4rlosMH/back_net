import { AppDataSource } from "../config/data-source.js";
import { SystemLog } from "../entities/SystemLog.js";
import { LessThan } from "typeorm"; // Importamos LessThan para filtrar fechas

export const registrarLog = async (usuario, accion, detalle, entidad_afectada, id_entidad) => {
    try {
        const logRepo = AppDataSource.getRepository(SystemLog);

        // 1. Insertar el nuevo log
        const nuevoLog = logRepo.create({
            usuario: usuario || "Sistema", 
            accion,
            detalle,
            entidad_afectada,
            id_entidad
        });
        await logRepo.save(nuevoLog);

        // 2. Limpieza automática (Eficiencia de espacio)
        // Solo conservamos los logs de los últimos 30 días
        const diasRetencion = 30;
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

        // Eliminamos todo registro cuya fecha sea menor (más antigua) que la fecha límite
        await logRepo.delete({
            fecha: LessThan(fechaLimite)
        });

    } catch (error) {
        // Usamos un try-catch silencioso para que, si el log falla, 
        // no rompa la operación principal (como crear un cliente o un pago)
        console.error("Error al gestionar logs:", error);
    }
};