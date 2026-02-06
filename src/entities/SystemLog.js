import { EntitySchema } from "typeorm";

export const SystemLog = new EntitySchema({
    name: "SystemLog",
    tableName: "sistema_logs",
    columns: {
        id: { primary: true, type: "int", generated: true },
        fecha: { createDate: true },
        usuario: { type: "varchar", nullable: true }, // "Admin" o el nombre del usuario
        accion: { type: "varchar" }, // "CREAR_CLIENTE", "REGISTRAR_PAGO", etc.
        detalle: { type: "text", nullable: true }, // Descripción legible
        entidad_afectada: { type: "varchar", nullable: true }, // "Cliente", "Pago"
        id_entidad: { type: "int", nullable: true } // ID del registro afectado
    }
});