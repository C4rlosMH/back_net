import { EntitySchema } from "typeorm";

export const CajaDistribucion = new EntitySchema({
    name: "CajaDistribucion",
    tableName: "cajas_distribucion",
    columns: {
        id: { primary: true, type: "int", generated: true },
        nombre: { type: "varchar" }, // Ej: "NAP-04 Sector Norte"
        latitud: { type: "float", precision: 10, scale: 6 },
        longitud: { type: "float", precision: 10, scale: 6 },
        capacidad_total: { type: "int", default: 8 }, 
        zona: { type: "varchar", nullable: true },
    },
    relations: {
        clientes: {
            type: "one-to-many",
            target: "Cliente",
            inverseSide: "caja", // [CORREGIDO] Debe coincidir con la propiedad 'caja' en Cliente.js
        },
    },
});