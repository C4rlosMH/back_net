import { AppDataSource } from "./src/config/data-source.js";
import { Cliente } from "./src/entities/Cliente.js";
import { Equipo } from "./src/entities/Equipo.js";
// Si tienes una entidad de Pagos y ya habías hecho pruebas de cobro, descomenta la siguiente línea:
// import { Pago } from "./src/entities/Pago.js";

async function limpiarDatos() {
    try {
        await AppDataSource.initialize();
        console.log("Conexion a la base de datos establecida.");

        const equipoRepo = AppDataSource.getRepository(Equipo);
        const clienteRepo = AppDataSource.getRepository(Cliente);
        
        // Si tienes pagos, descomenta esto también para evitar errores de llaves foráneas:
        // const pagoRepo = AppDataSource.getRepository(Pago);

        // 1. Borrar pagos (si existen)
        // console.log("Eliminando historial de pagos...");
        // const pagos = await pagoRepo.find();
        // if (pagos.length > 0) await pagoRepo.remove(pagos);

        // 2. Borrar equipos (porque dependen del cliente)
        console.log("Eliminando inventario de equipos...");
        const equipos = await equipoRepo.find();
        if (equipos.length > 0) await equipoRepo.remove(equipos);

        // 3. Borrar clientes
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