import { EntitySchema } from "typeorm";

export const Gasto = new EntitySchema({
    name: "Gasto",
    tableName: "gastos",
    columns: {
        id: { primary: true, type: "int", generated: true },
        concepto: { type: "varchar", length: 255 },
        monto: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
        categoria: { 
            type: "enum", 
            enum: ["Fijo", "Operativo", "Inventario", "Otros"], 
            default: "Otros" 
        },
        fecha: { createDate: true },
    },
    indices: [
        { columns: ["categoria"] },
        { columns: ["fecha"] }
    ],
    relations: {
        usuario: {
            type: "many-to-one",
            target: "UserSistema",
            joinColumn: { name: "usuarioId" },
            nullable: true
        }
    }
});