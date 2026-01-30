import { EntitySchema } from "typeorm";

export const Cliente = new EntitySchema({
    name: "Cliente",
    tableName: "clientes",
    columns: {
        id: { primary: true, type: "int", generated: true },
        nombre_completo: { type: "varchar" },
        telefono: { type: "varchar" },
        direccion: { type: "text", nullable: true },
        
        // Mapa
        latitud: { type: "float", precision: 10, scale: 6, nullable: true },
        longitud: { type: "float", precision: 10, scale: 6, nullable: true },

        // Estado y Finanzas
        estado: { 
            type: "enum", 
            enum: ["ACTIVO", "SUSPENDIDO", "CORTADO", "BAJA"], 
            default: "ACTIVO" 
        },
        dia_corte: { type: "int", default: 1 }, 
        saldo_actual: { 
            type: "decimal", 
            precision: 10, 
            scale: 2, 
            default: 0.00 
        }, 

        createdAt: { createDate: true },
    },
    relations: {
        plan: {
            type: "many-to-one",
            target: "Plan",
            joinColumn: true,
            inverseSide: "clientes",
        },
        cajaConectada: { // Relación con la Caja del poste
            type: "many-to-one",
            target: "CajaDistribucion",
            joinColumn: { name: "cajaId" },
            nullable: true,
            inverseSide: "clientes",
        },
        equipos: {
            type: "one-to-many",
            target: "Equipo",
            inverseSide: "cliente",
        },
        movimientos: {
            type: "one-to-many",
            target: "MovimientoFinanciero",
            inverseSide: "cliente",
        }
    },
});