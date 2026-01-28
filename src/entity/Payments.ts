import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Client } from "./Client";
import { PaymentMethod } from "./Enums";

@Entity()
export class Payment {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("decimal", { precision: 10, scale: 2 })
    amount!: number; // Cuánto pagó (ej: 450.00)

    @Column()
    paymentDate!: Date; // Cuándo pagó (puede ser hoy o una fecha pasada)

    @Column({ nullable: true })
    concept?: string; // Ej: "Mensualidad Enero", "Instalación", "Adeudo anterior"

    @Column({
        type: "enum",
        enum: PaymentMethod,
        default: PaymentMethod.EFECTIVO
    })
    method!: PaymentMethod;

    @CreateDateColumn()
    createdAt!: Date; // Cuándo registraste el pago en el sistema

    // Relación: Muchos Pagos pertenecen a Un Cliente
    @ManyToOne(() => Client, (client) => client.payments)
    client!: Client;
}