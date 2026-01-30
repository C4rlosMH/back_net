import { EntitySchema } from "typeorm";

export const Plan = new EntitySchema({
    name: "Plan",
    tableName: "planes",
    columns: {
        id: { primary: true, type: "int", generated: true },
        nombre: { type: "varchar" }, // Ej: "Fibra 50MB"
        velocidad_mb: { type: "int" },
        precio_mensual: { type: "decimal", precision: 10, scale: 2 },
        activo: { type: "boolean", default: true },
    },
    relations: {
        clientes: {
            type: "one-to-many",
            target: "Cliente",
            inverseSide: "plan",
        },
    },
});