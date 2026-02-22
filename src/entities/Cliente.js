import { EntitySchema } from "typeorm";

export const Cliente = new EntitySchema({
    name: "Cliente",
    tableName: "clientes",
    columns: {
        id: { primary: true, type: "int", generated: true },
        nombre_completo: { type: "varchar" },
        telefono: { type: "varchar", nullable: true }, 
        direccion: { type: "text", nullable: true },
        dia_pago: { type: "int", default: 15 },
        
        latitud: { type: "float", nullable: true }, 
        longitud: { type: "float", nullable: true }, 

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

        usuario_pppoe: {
            type: "varchar",
            length: 100,
            nullable: true
        },

        dia_corte: { type: "int", default: 1 }, 
        saldo_actual: { type: "decimal", precision: 10, scale: 2, default: 0.00 }, 
        fecha_instalacion: { type: "date", nullable: true },

        // --- NUEVOS CAMPOS ---
        confiabilidad: {
            type: "int",
            nullable: true,
            default: null
        },
        tipo_conexion: { 
            type: "enum", 
            enum: ["fibra", "radio"], 
            default: "fibra" 
        },
        saldo_aplazado: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
        
        // ---> NUEVO CAMPO AÑADIDO <---
        deuda_historica: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
        
        // --- BOLSA DE SALDO A FAVOR ---
        saldo_a_favor: { type: "decimal", precision: 10, scale: 2, default: 0.00 },

        createdAt: { createDate: true },
    },

    indices: [
        { columns: ["estado"] },
        { columns: ["dia_pago"] },
        { columns: ["saldo_actual"] }
    ],

    relations: {
        plan: {
            type: "many-to-one",
            target: "Plan",
            joinColumn: { name: "planId" }, 
            nullable: true
        },
        caja: { 
            type: "many-to-one",
            target: "CajaDistribucion",
            joinColumn: { name: "cajaId" },
            nullable: true
        },
        equipos: {
            type: "one-to-many",
            target: "Equipo",
            inverseSide: "cliente",
            cascade: true
        },
        movimientos: {
            type: "one-to-many",
            target: "MovimientoFinanciero",
            inverseSide: "cliente",
        }
    },
});