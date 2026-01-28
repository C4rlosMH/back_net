import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./Auth"; // Tu tabla de usuarios (Admins/Técnicos)

@Entity()
export class SystemLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    action!: string; // Ej: "CREAR", "EDITAR", "ELIMINAR", "COBRAR"

    @Column()
    module!: string; // Ej: "CLIENTES", "PAGOS", "EQUIPOS"

    @Column()
    details!: string; // Ej: "Se registró pago de $500 al cliente #45"

    @CreateDateColumn()
    createdAt!: Date;

    // Relación: Saber QUÉ usuario hizo la acción
    @ManyToOne(() => User, { nullable: true }) 
    user!: User; 
}