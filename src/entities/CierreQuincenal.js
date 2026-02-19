import { EntitySchema } from "typeorm";

export const CierreQuincenal = new EntitySchema({
    name: "CierreQuincenal",
    tableName: "cierres_quincenales",
    columns: {
        id: { primary: true, type: "int", generated: true },
        periodo: { type: "varchar" }, // Ejemplo: "1-15 Enero 2026"
        meta_estimada: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
        cobrado_a_tiempo: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
        cobrado_recuperado: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
        faltante: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
        
        createdAt: { createDate: true },
        updatedAt: { updateDate: true }
    }
});