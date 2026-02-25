import { EntitySchema } from "typeorm";

export const Ticket = new EntitySchema({
    name: "Ticket",
    tableName: "tickets",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true
        },
        cliente_id: {
            type: "int"
        },
        categoria: {
            type: "varchar",
            length: 100
        },
        asunto: {
            type: "varchar",
            length: 255
        },
        descripcion: {
            type: "text"
        },
        estado: {
            type: "enum",
            enum: ["ABIERTO", "EN_PROGRESO", "CERRADO"],
            default: "ABIERTO"
        },
        fecha_creacion: {
            type: "timestamp",
            createDate: true
        },
        fecha_actualizacion: {
            type: "timestamp",
            updateDate: true
        },
        prioridad: {
        type: "enum",
        enum: ["BAJA", "MEDIA", "ALTA"],
        default: "BAJA"
    }
    },
    relations: {
        cliente: {
            target: "Cliente",
            type: "many-to-one",
            joinColumn: { name: "cliente_id" },
            onDelete: "CASCADE"
        }
    }
});