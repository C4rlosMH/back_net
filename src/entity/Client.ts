import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne } from "typeorm";
import { ClientStatus } from "./Enums"; // Asegúrate de tener este archivo creado
import { Equipment } from "./Equipment"; // Importamos la clase Equipment
import { Plan } from "./Plan";

@Entity()
export class Client {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    address!: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    coordinates?: string;

    @Column({
        type: "enum",
        enum: ClientStatus,
        default: ClientStatus.ACTIVO
    })
    status!: ClientStatus;

    @CreateDateColumn()
    createdAt!: Date;

    // --- RELACIÓN IMPORTANTE ---
    // Un Cliente tiene MUCHOS Equipos
    @OneToMany(() => Equipment, (equipment) => equipment.client)
    equipments!: Equipment[];

    @ManyToOne(() => Plan, (plan) => plan.clients, { nullable: true })
    plan?: Plan;
}