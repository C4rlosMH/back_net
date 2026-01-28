import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number; // <--- ¡Fíjate en el signo de exclamación!

    @Column({ unique: true })
    username!: string;

    @Column()
    password!: string;

    @Column()
    name!: string;

    @Column({ default: 'TECNICO' })
    role!: string;

    @CreateDateColumn()
    createdAt!: Date;
}