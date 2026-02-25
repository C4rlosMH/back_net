import { EntitySchema } from "typeorm";

export const TicketMensaje = new EntitySchema({
    name: "TicketMensaje",
    tableName: "ticket_mensajes",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true
        },
        ticket_id: {
            type: "int"
        },
        remitente: {
            type: "enum",
            enum: ["CLIENTE", "ADMIN"]
        },
        mensaje: {
            type: "text"
        },
        fecha_creacion: {
            type: "timestamp",
            createDate: true
        }
    },
    relations: {
        ticket: {
            target: "Ticket",
            type: "many-to-one",
            joinColumn: { name: "ticket_id" },
            onDelete: "CASCADE"
        }
    }
});