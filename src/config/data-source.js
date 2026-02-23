import { DataSource } from "typeorm";
import dotenv from "dotenv";

// Importamos las entidades
import { UserSistema } from "../entities/UserSistema.js";
import { Plan } from "../entities/Plan.js";
import { CajaDistribucion } from "../entities/CajaDistribucion.js";
import { Cliente } from "../entities/Cliente.js";
import { Equipo } from "../entities/Equipo.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";
import { SystemLog } from "../entities/SystemLog.js";
import { CierreQuincenal } from "../entities/CierreQuincenal.js";
import { ClienteLog } from "../entities/ClienteLog.js";

// --- NUEVAS IMPORTACIONES ---
import { Gasto } from "../entities/Gasto.js";
import { Insumo } from "../entities/Insumo.js";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true, 
    logging: false,
    entities: [
        UserSistema,
        Plan,
        CajaDistribucion,
        Cliente,
        Equipo,
        MovimientoFinanciero,
        SystemLog,
        CierreQuincenal,
        // --- AGREGADAS AQUI ---
        Gasto,
        Insumo,
        ClienteLog
    ],
    migrations: [],
    subscribers: [],
});