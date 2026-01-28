import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "mirandanet_db",
    synchronize: true, // ¡OJO! Esto crea las tablas automáticamente (solo para desarrollo)
    logging: false,
    entities: ["src/entity/**/*.ts"], // Busca automáticamente tus modelos aquí
    subscribers: [],
    migrations: [],
});