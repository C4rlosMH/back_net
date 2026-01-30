import { DataSource } from "typeorm";
import dotenv from "dotenv";

// Importamos las entidades explícitamente
import { UserSistema } from "../entities/UserSistema.js";
import { Plan } from "../entities/Plan.js";
import { CajaDistribucion } from "../entities/CajaDistribucion.js";
import { Cliente } from "../entities/Cliente.js";
import { Equipo } from "../entities/Equipo.js";
import { MovimientoFinanciero } from "../entities/MovimientoFinanciero.js";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "mysql",
    url: process.env.DATABASE_URL,
    synchronize: true, // Esto creará las tablas. En producción se apaga.
    logging: false,
    entities: [
        UserSistema,
        Plan,
        CajaDistribucion,
        Cliente,
        Equipo,
        MovimientoFinanciero
    ],
    migrations: [],
    subscribers: [],
});