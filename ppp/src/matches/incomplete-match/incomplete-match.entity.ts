import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { MatchType } from '../../common/enums/match-type.enum';
import { User } from 'src/users/entities/user.entity';
import { Field } from 'src/fields/entities/field.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';

@Entity('incomplete_match')
export class IncompleteMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: MatchType.INCOMPLETE })
  type: MatchType;

  @Column()
  title: string;

  @Column()
  city: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @Column({ nullable: true })
  contactPhone: string ;

  @Column({ nullable: true })
  date: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.createdIncompleteMatches, { nullable: false })
  creator: User;

  @ManyToOne(() => Field, (field) => field.incompleteMatches, { nullable: false })
  field: Field;

  @OneToMany(() => Reservation, (reservation) => reservation.incompleteMatch)
  reservations: Reservation[];

  @Column({ nullable: true })
  minAge: number;

  @Column({ nullable: true })
  maxAge: number;

  @Column({ type: 'float', nullable: true })
  minSkillLevel: number;

  @Column({ type: 'float', nullable: true })
  maxSkillLevel: number;

  @Column({ type: 'int', default: 2 })
  initialCurrentPlayers: number;

  @Column({ type: 'int', default: 2 })
  currentPlayers: number;

  @Column({ type: 'int', default: 14 })
  maxPlayers: number;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @ManyToMany(() => User, (user) => user.joinedMatches)
  @JoinTable()
  players: User[];

  @ManyToMany(() => User)
  @JoinTable({ name: 'match_pending_players' })
  pendingPlayers: User[]; 

  @ManyToMany(() => User)
  @JoinTable({ name: 'match_invited_players' })
  invitedPlayers: User[];
  }