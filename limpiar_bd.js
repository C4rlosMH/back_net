import { AppDataSource } from "./src/config/data-source.js";
import { Cliente } from "./src/entities/Cliente.js";
import { Equipo } from "./src/entities/Equipo.js";
import { MovimientoFinanciero } from "./src/entities/MovimientoFinanciero.js";
import { SystemLog } from "./src/entities/SystemLog.js";
import { CierreQuincenal } from "./src/entities/CierreQuincenal.js";

async function limpiarDatos() {
    try {
        await AppDataSource.initialize();
        console.log("Conexion a la base de datos establecida.");

        const logRepo = AppDataSource.getRepository(SystemLog);
        const cierreRepo = AppDataSource.getRepository(CierreQuincenal);
        const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);
        const equipoRepo = AppDataSource.getRepository(Equipo);
        const clienteRepo = AppDataSource.getRepository(Cliente);
        
        // 0. Borrar Logs de Sistema y Cierres
        console.log("Eliminando logs del sistema y cierres quincenales...");
        const logs = await logRepo.find();
        if (logs.length > 0) await logRepo.remove(logs);

        const cierres = await cierreRepo.find();
        if (cierres.length > 0) await cierreRepo.remove(cierres);

        // 1. Borrar Movimientos Financieros (porque dependen del cliente)
        console.log("Eliminando historial de movimientos financieros...");
        const movimientos = await movimientoRepo.find();
        if (movimientos.length > 0) await movimientoRepo.remove(movimientos);

        // 2. Borrar equipos (porque dependen del cliente)
        console.log("Eliminando inventario de equipos...");
        const equipos = await equipoRepo.find();
        if (equipos.length > 0) await equipoRepo.remove(equipos);

        // 3. Borrar clientes (ahora que ya no tienen dependencias)
        console.log("Eliminando cartera de clientes...");
        const clientes = await clienteRepo.find();
        if (clientes.length > 0) await clienteRepo.remove(clientes);

        console.log("\nLimpieza completada con exito.");
        console.log("Tus Usuarios, Cajas NAP y Planes siguen intactos y listos para la nueva importacion.");
        process.exit(0);

    } catch (error) {
        console.error("Error critico durante la limpieza:", error);
        process.exit(1);
    }
}

limpiarDatos();