import { EntitySchema } from "typeorm";

export const MovimientoFinanciero = new EntitySchema({
    name: "MovimientoFinanciero",
    tableName: "movimientos_financieros",
    columns: {
        id: { primary: true, type: "int", generated: true },
        mes_servicio: { type: "varchar", nullable: true }, // Ej: "Enero 2024"
        
        tipo: { 
            type: "enum", 
            enum: ["CARGO_MENSUAL", "ABONO", "AJUSTE_FAVOR", "AJUSTE_CONTRA"], 
        },
        
        monto: { type: "decimal", precision: 10, scale: 2 },
        fecha: { createDate: true },
        descripcion: { type: "varchar" },
        
        metodo_pago: { 
            type: "enum", 
            enum: ["EFECTIVO", "TRANSFERENCIA", "DEPOSITO", "SISTEMA"], 
            nullable: true 
        },
        
        usuario_responsable: { type: "varchar", nullable: true }, 
    },
    relations: {
        cliente: {
            type: "many-to-one",
            target: "Cliente",
            joinColumn: true,
            inverseSide: "movimientos",
        },
    },
});