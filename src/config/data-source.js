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

dotenv.config();

export const AppDataSource = new DataSource({
    type: "mysql",
    url: process.env.DATABASE_URL,
    synchronize: true, // Mantiene la estructura actualizada, pero NO borra datos
    logging: false,
    entities: [
        UserSistema,
        Plan,
        CajaDistribucion,
        Cliente,
        Equipo,
        MovimientoFinanciero,
        SystemLog
    ],
    migrations: [],
    subscribers: [],
});