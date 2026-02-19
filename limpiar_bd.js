import { AppDataSource } from "./src/config/data-source.js";
import { Cliente } from "./src/entities/Cliente.js";
import { Equipo } from "./src/entities/Equipo.js";
import { MovimientoFinanciero } from "./src/entities/MovimientoFinanciero.js";

async function limpiarDatos() {
    try {
        await AppDataSource.initialize();
        console.log("Conexion a la base de datos establecida.");

        const movimientoRepo = AppDataSource.getRepository(MovimientoFinanciero);
        const equipoRepo = AppDataSource.getRepository(Equipo);
        const clienteRepo = AppDataSource.getRepository(Cliente);
        
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
        console.log("Tus Usuarios, Cajas NAP y Planes siguen intactos.");
        process.exit(0);

    } catch (error) {
        console.error("Error critico durante la limpieza:", error);
        process.exit(1);
    }
}

limpiarDatos();