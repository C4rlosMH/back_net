import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { EquipmentType, EquipmentStatus } from "./Enums";
import { Client } from "./Client";

@Entity()
export class Equipment {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        type: "enum",
        enum: EquipmentType
    })
    type!: EquipmentType;

    @Column({
        type: "enum",
        enum: EquipmentStatus,
        default: EquipmentStatus.BODEGA
    })
    status!: EquipmentStatus;

    @Column({ nullable: true })
    brand?: string;

    @Column({ nullable: true })
    modelName?: string;

    @Column({ unique: true })
    sn!: string; // Serial Number

    @Column({ unique: true })
    mac!: string;

    // --- Credenciales del Equipo ---
    @Column({ default: "admin" })
    adminUser!: string;

    @Column()
    adminPass!: string;

    // --- Datos WiFi (Opcionales) ---
    @Column({ nullable: true })
    ssid?: string;

    @Column({ nullable: true })
    wifiPass?: string;

    // --- Gestión de Red ---
    @Column({ nullable: true })
    managementIp?: string;

    @Column({ nullable: true })
    pppoeUser?: string;

    @Column({ nullable: true })
    pppoePass?: string;

    // --- Relación con Cliente ---
    @ManyToOne(() => Client, (client) => client.equipments, { nullable: true })
    client?: Client;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}