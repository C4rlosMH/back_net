import { EntitySchema } from "typeorm";

export const Equipo = new EntitySchema({
    name: "Equipo",
    tableName: "equipos",
    columns: {
        id: { primary: true, type: "int", generated: true },
        nombre: { type: "varchar", nullable: true },
        tipo: { 
            type: "enum", 
            enum: ["ANTENA", "ROUTER", "MODEM"], 
            default: "ROUTER" 
        },
        marca: { type: "varchar" },
        modelo: { type: "varchar" },
        mac_address: { type: "varchar", unique: true },
        serie: { type: "varchar", unique: true, nullable: true },
        
        estado: { 
            type: "enum", 
            enum: ["ALMACEN", "INSTALADO", "RETIRADO", "OBSOLETO"], 
            default: "ALMACEN" 
        },
        precio_compra: { type: "decimal", nullable: true },
        fecha_compra: { type: "date", nullable: true },
    },
    relations: {
        cliente: {
            type: "many-to-one",
            target: "Cliente",
            joinColumn: true,
            nullable: true,
            inverseSide: "equipos",
        },
    },
});