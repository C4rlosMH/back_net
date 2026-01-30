import { EntitySchema } from "typeorm";

export const UserSistema = new EntitySchema({
    name: "UserSistema",
    tableName: "usuarios_sistema",
    columns: {
        id: { primary: true, type: "int", generated: true },
        nombre: { type: "varchar" },
        username: { type: "varchar", unique: true },
        password: { type: "varchar" }, 
        rol: { 
            type: "enum", 
            enum: ["ADMIN", "TECNICO"], 
            default: "TECNICO" 
        },
        activo: { type: "boolean", default: true },
        createdAt: { createDate: true },
    }
});