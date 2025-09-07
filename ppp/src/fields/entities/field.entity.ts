import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Terrain } from 'src/terrain/terrain.entity';
import { FullMatch } from 'src/matches/full-match/full-match.entity';
import { IncompleteMatch } from 'src/matches/incomplete-match/incomplete-match.entity';
import { TeamVsTeamMatch } from 'src/matches/team-vs-team-match/team-vs-team-match.entity';

@Entity('fields')
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column({ type: 'float' })
  pricePerHour: number;

  @Column({ default: 90 })
  matchDuration: number;

  @Column({ default: false })
  hasShowers: boolean;

  @Column({ default: false })
  hasWater: boolean;

  @Column({ default: false })
  isIndoor: boolean;

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'int', default: 1 })
  numberOfTerrains: number;

  @ManyToOne(() => User, (user) => user.fields)
  owner: User;

  @OneToMany(() => Terrain, (terrain) => terrain.field, { cascade: true })
  terrains: Terrain[];

  @OneToMany(() => Reservation, (reservation) => reservation.field)
  reservations: Reservation[];

  @OneToMany(() => FullMatch, (match) => match.field)
  fullMatches: FullMatch[];

  @OneToMany(() => IncompleteMatch, (match) => match.field)
  incompleteMatches: IncompleteMatch[];

  @OneToMany(() => TeamVsTeamMatch, (match) => match.field)
  teamVsTeamMatches: TeamVsTeamMatch[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'time', nullable: true })
  openingTime: string;

  @Column({ type: 'time', nullable: true })
  closingTime: string;
}
