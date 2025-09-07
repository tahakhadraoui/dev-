import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Field } from '../fields/entities/field.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

@Entity('terrains')
export class Terrain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Field, (field) => field.terrains, { onDelete: 'CASCADE' })
  field: Field;

  @OneToMany(() => Reservation, (reservation) => reservation.terrain)
  reservations: Reservation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}