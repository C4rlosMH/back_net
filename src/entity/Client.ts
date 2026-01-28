import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne } from "typeorm";
import { ClientStatus } from "./Enums"; // Asegúrate de tener este archivo creado
import { Equipment } from "./Equipment"; // Importamos la clase Equipment
import { Plan } from "./Plan";
import { Payment } from "./Payments";

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

   @Column({ default: 30 })
    cutOffDay!: number; // Día 15 o 30

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    balance!: number; // Control de deudas o saldos a favor

    @CreateDateColumn()
    createdAt!: Date;

    // --- RELACIÓN IMPORTANTE ---
    // Un Cliente tiene MUCHOS Equipos
    @OneToMany(() => Equipment, (equipment) => equipment.client)
    equipments!: Equipment[];

    @ManyToOne(() => Plan, (plan) => plan.clients, { nullable: true })
    plan?: Plan;

    @OneToMany(() => Payment, (payment) => payment.client)
    payments!: Payment[];
}