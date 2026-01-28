import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Client } from "./Client"; // (Dará error un segundo hasta que actualicemos Client)

@Entity()
export class Plan {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    name!: string; // Ej: "Residencial 50MB"

    @Column("decimal", { precision: 10, scale: 2 }) 
    price!: number; // Ej: 450.00

    @Column()
    downloadSpeed!: number; // En Mbps, ej: 50

    @Column()
    uploadSpeed!: number; // En Mbps, ej: 20

    @Column({ default: true })
    isActive!: boolean; // Para ocultar planes viejos sin borrarlos

    @CreateDateColumn()
    createdAt!: Date;

    // Relación: Un Plan tiene muchos Clientes
    @OneToMany(() => Client, (client) => client.plan)
    clients!: Client[];
}