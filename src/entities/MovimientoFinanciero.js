import { EntitySchema } from "typeorm";

export const MovimientoFinanciero = new EntitySchema({
    name: "MovimientoFinanciero",
    tableName: "movimientos_financieros",
    columns: {
        id: { primary: true, type: "int", generated: true },
        mes_servicio: { type: "varchar", nullable: true }, // Ej: "Enero 2024"
        
        // CORRECCIÓN: Borramos la línea de 'enum' por completo
        tipo: { 
            type: "varchar"
        },
        
        monto: { type: "decimal", precision: 10, scale: 2 },
        fecha: { createDate: true },
        descripcion: { type: "varchar" },
        
        // CORRECCIÓN: Borramos la línea de 'enum' por completo
        metodo_pago: { 
            type: "varchar", 
            nullable: true 
        },

        referencia: { 
            type: "varchar", 
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