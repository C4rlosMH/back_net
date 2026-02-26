import { EntitySchema } from "typeorm";

export const Ticket = new EntitySchema({
  name: "Ticket",
  tableName: "tickets",
  columns: {
    id: { primary: true, type: "int", generated: true },
    cliente_id: { type: "int" },
    responsable_id: { type: "int", nullable: true },
    categoria: { type: "varchar", length: 100 },
    asunto: { type: "varchar", length: 255 },
    descripcion: { type: "text" },
    solucion: { type: "text", nullable: true },
    estado: {
      type: "enum",
      enum: ["ABIERTO", "EN_PROGRESO", "ESPERANDO", "CERRADO"],
      default: "ABIERTO",
    },
    calificacion: { type: "int", nullable: true }, // Guardará de 1 a 5
    comentario_calificacion: { type: "text", nullable: true },
    fecha_creacion: { type: "timestamp", createDate: true },
    fecha_actualizacion: { type: "timestamp", updateDate: true },
    prioridad: {
      type: "enum",
      enum: ["BAJA", "MEDIA", "ALTA"],
      default: "BAJA",
    },
  },
  relations: {
    cliente: {
      target: "Cliente",
      type: "many-to-one",
      joinColumn: { name: "cliente_id" },
      onDelete: "CASCADE",
    },
    responsable: {
      target: "UserSistema",
      type: "many-to-one",
      joinColumn: { name: "responsable_id" },
      onDelete: "SET NULL",
    },
  },
});
