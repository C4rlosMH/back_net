import { EntitySchema } from "typeorm";

export const Insumo = new EntitySchema({
    name: "Insumo",
    tableName: "insumos",
    columns: {
        id: { primary: true, type: "int", generated: true },
        nombre: { type: "varchar", length: 255 },
        cantidad: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
        unidad_medida: { type: "varchar", length: 50 }, 
        ultima_actualizacion: { updateDate: true },
        createdAt: { createDate: true }
    },
    indices: [
        { columns: ["nombre"] }
    ]
});