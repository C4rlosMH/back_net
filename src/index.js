import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppDataSource } from "./config/data-source.js";

//importar rutas
import clienteRoutes from "./routes/cliente.routes.js";
import equipoRoutes from "./routes/equipo.routes.js";
import pagoRoutes from "./routes/pago.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

dotenv.config();
const app = express();

// Middlewares Globales
app.use(cors());
app.use(express.json());

// Usar rutas
app.use("/api/clientes", clienteRoutes);
app.use("/api/equipos", equipoRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT;

async function main() {
    try {
        // 1. Iniciar conexión a BD
        await AppDataSource.initialize();
        console.log("Base de Datos conectada con TypeORM");

        // 2. Iniciar Servidor Express
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Error al iniciar la aplicación:", error);
    }
}

main();