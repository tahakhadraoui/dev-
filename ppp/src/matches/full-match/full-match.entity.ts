import { MatchStatus } from 'src/common/enums/match-status.enum';
import { MatchType } from 'src/common/enums/match-type.enum';
import { Field } from 'src/fields/entities/field.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';


@Entity()
export class FullMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MatchType })
  type: MatchType;

  @Column()
  title: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: MatchStatus })
  status: MatchStatus;

  @Column({ nullable: true })
  contactPhone: string;

  @Column()
  date: Date;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column()
  isPublic: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @ManyToOne(() => User)
  creator: User;

  @ManyToOne(() => Field)
  field: Field;

  @OneToMany(() => Reservation, (reservation) => reservation.match)
  reservations: Reservation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}