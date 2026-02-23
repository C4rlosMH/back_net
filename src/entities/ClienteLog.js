import { EntitySchema } from "typeorm";

export const ClienteLog = new EntitySchema({
    name: "ClienteLog",
    tableName: "cliente_logs",
    columns: {
        id: { primary: true, type: "int", generated: true },
        numero_suscriptor: { type: "varchar" }, 
        accion: { type: "varchar" }, 
        descripcion: { type: "text" },
        fecha: { createDate: true },
    },
    indices: [
        { columns: ["numero_suscriptor"] },
        { columns: ["accion"] }
    ],
    relations: {
        cliente: {
            type: "many-to-one",
            target: "Cliente",
            joinColumn: { name: "clienteId" },
            nullable: true,
            onDelete: "SET NULL" 
        }
    }
});