import { EntitySchema } from "typeorm";

export const Cliente = new EntitySchema({
    name: "Cliente",
    tableName: "clientes",
    columns: {
        id: { primary: true, type: "int", generated: true },
        nombre_completo: { type: "varchar" },
        telefono: { type: "varchar", nullable: true }, // <--- Agregué nullable por si acaso
        direccion: { type: "text", nullable: true },
        dia_pago: { type: "int", default: 15 },
        
        latitud: { type: "float", nullable: true }, // <--- Simplificado
        longitud: { type: "float", nullable: true }, // <--- Simplificado

        estado: { 
            type: "enum", 
            enum: ["ACTIVO", "SUSPENDIDO", "CORTADO", "BAJA"], 
            default: "ACTIVO" 
        },
        
        ip_asignada: {
            type: "varchar",
            length: 50,
            nullable: true
        },

        dia_corte: { type: "int", default: 1 }, 
        saldo_actual: { type: "decimal", precision: 10, scale: 2, default: 0.00 }, 
        fecha_instalacion: { type: "date", nullable: true }, // <--- Agregado (útil para el front)


        createdAt: { createDate: true },
    },
    relations: {
        plan: {
            type: "many-to-one",
            target: "Plan",
            joinColumn: { name: "planId" }, // <--- Especificar nombre ayuda a evitar errores
            nullable: true
        },
        // --- CAMBIO IMPORTANTE: DE "cajaConectada" A "caja" ---
        caja: { 
            type: "many-to-one",
            target: "CajaDistribucion",
            joinColumn: { name: "cajaId" },
            nullable: true
        },
        equipos: {
            type: "one-to-many",
            target: "Equipo",
            inverseSide: "cliente", // Asegúrate que en Equipo.js la relación se llame "cliente"
            cascade: true
        },
        movimientos: {
            type: "one-to-many",
            target: "MovimientoFinanciero",
            inverseSide: "cliente",
        }
    },
});