import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet"; // <--- SEGURIDAD
import compression from "compression"; // <--- OPTIMIZACIÓN
import morgan from "morgan"; // <--- MONITOREO
import rateLimit from "express-rate-limit"; // <--- PROTECCIÓN

import { AppDataSource } from "./config/data-source.js";
import {createAdminUser} from "./utils/initialSetup.js";
import {seedDatabase} from "./utils/seedDatabase.js";


import { iniciarCronFacturacion } from "./crons/facturacion.cron.js";
import { iniciarCronPenalizacion } from "./crons/penalizacion.cron.js";
import { iniciarCronWhatsApp } from "./crons/whatsapp.cron.js";
import { iniciarCronSuspension } from "./crons/suspencion.cron.js";
import { iniciarCronCierres } from "./crons/cierre.cron.js";

//importar rutas
import clienteRoutes from "./routes/cliente.routes.js";
import equipoRoutes from "./routes/equipo.routes.js";
import pagoRoutes from "./routes/pago.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import planRoutes from "./routes/plan.routes.js";
import cajaRoutes from "./routes/caja.routes.js";
import logRoutes from "./routes/log.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js"; // <--- IMPORTAR
import cierreRoutes from "./routes/cierre.routes.js"; // <--- IMPORTAR RUTAS DE CIERRE
import gastoRoutes from "./routes/gasto.routes.js";
import insumoRoutes from "./routes/insumo.routes.js";
import portalRoutes from "./routes/portal.routes.js";

import mercadopagoRoutes from "./routes/mercadopago.routes.js";

dotenv.config();
const app = express();

// --- 1. MIDDLEWARES DE SEGURIDAD Y OPTIMIZACIÓN ---

// Helmet: Añade cabeceras HTTP de seguridad
app.use(helmet()); 

// Compression: Comprime las respuestas (JSON) para ahorrar ancho de banda
app.use(compression()); 

// Morgan: Imprime en consola las peticiones entrantes (útil para ver qué está pasando)
app.use(morgan("dev"));

// Rate Limiter: Previene ataques de fuerza bruta o bugs que saturen el servidor
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5000, // Límite de 1000 peticiones por IP cada 15 minutos (suficiente para uso interno)
    message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde."
});
app.use("/api/", limiter);

// --- 2. CONFIGURACIÓN DE CORS (Adaptado para Red Local) ---
const allowedOrigins = [
    'http://localhost:5173', // Tu frontend en modo desarrollo
    'http://localhost:5174', // Tu frontend en modo desarrollo
    'http://localhost:5000', // Tu frontend compilado con 'serve' local
    process.env.FRONTEND_URL // IP de la red local (Configúralo en tu .env del backend)
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como Postman) o si el origen está en la lista permitida
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por CORS'));
        }
    },
    credentials: true // Necesario para enviar cookies o headers de autorización
}));

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Usar rutas
app.use("/api/clientes", clienteRoutes);
app.use("/api/equipos", equipoRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/planes", planRoutes);
app.use("/api/cajas", cajaRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/whatsapp", whatsappRoutes); // <--- USAR RUTAS DE WHATSAPP
app.use("/api/cierres", cierreRoutes); // <--- USAR RUTAS DE CIERRE
app.use("/api/gastos", gastoRoutes);
app.use("/api/insumos", insumoRoutes);


//Rutas para el portal del cliente (Solo lectura, sin autenticación) - Opcionalmente podrías agregar autenticación con JWT para clientes
app.use("/api/portal", portalRoutes); // <--- USAR RUTAS DE PORTAL

// La ruta base quedará como: /api/webhooks/mercadopago/webhook
app.use("/api/webhooks/mercadopago", mercadopagoRoutes);

const PORT = process.env.PORT;

async function main() {
    try {
        // 1. Iniciar conexión a BD
        await AppDataSource.initialize();
        console.log("Base de Datos conectada con TypeORM");

        await createAdminUser();

        iniciarCronFacturacion();
        iniciarCronPenalizacion();
        iniciarCronWhatsApp();
        iniciarCronSuspension()
        iniciarCronCierres()

        //await seedDatabase(); // <--- EJECUCIÓN AUTOMÁTICA
        // 2. Iniciar Servidor Express
        app.listen(PORT,'0.0.0.0' , () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Error al iniciar la aplicación:", error);
    }
}

main();