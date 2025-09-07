import { ReservationStatus } from 'src/common/enums/reservation-status.enum';
import { Field } from 'src/fields/entities/field.entity';
import { FullMatch } from 'src/matches/full-match/full-match.entity';
import { IncompleteMatch } from 'src/matches/incomplete-match/incomplete-match.entity';
import { TeamVsTeamMatch } from 'src/matches/team-vs-team-match/team-vs-team-match.entity';
import { Terrain } from 'src/terrain/terrain.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  phoneNumber: string;

  @Column()
  date: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ nullable: true })
  statusComment: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  reservedStatus: ReservationStatus;

  @ManyToOne(() => Field, (field) => field.reservations)
  field?: Field;

  @ManyToOne(() => Terrain, (terrain) => terrain.reservations, { nullable: true })
  terrain?: Terrain;

  @ManyToOne(() => FullMatch, (match) => match.reservations, { nullable: true })
  match?: FullMatch;

  @ManyToOne(() => IncompleteMatch, (match) => match.reservations, { nullable: true })
  incompleteMatch?: IncompleteMatch;

  @ManyToOne(() => TeamVsTeamMatch, (match) => match.reservations, { nullable: true })
  teamVsTeamMatch?: TeamVsTeamMatch;

  @ManyToOne(() => User, (user) => user.reservations)
  user?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}