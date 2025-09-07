import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { MatchType } from '../../common/enums/match-type.enum';
import { User } from 'src/users/entities/user.entity';
import { Field } from 'src/fields/entities/field.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Team } from 'src/teams/entities/team.entity';

@Entity('team_vs_team_match')
export class TeamVsTeamMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: MatchType.TEAM_VS_TEAM })
  type: MatchType;

  @Column()
  title: string;

  @Column()
  city: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @Column()
  contactPhone: string;

  @Column({ type: 'timestamp' })
  date: Date;

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

  @ManyToOne(() => User, (user) => user.createdTeamVsTeamMatches, { nullable: false })
  creator: User;

  @ManyToOne(() => Field, (field) => field.teamVsTeamMatches, { nullable: false })
  field: Field;

  @OneToMany(() => Reservation, (reservation) => reservation.teamVsTeamMatch)
  reservations: Reservation[];

  @Column({ nullable: true })
  minAge: number;

  @Column({ nullable: true })
  maxAge: number;

  @Column({ type: 'float', nullable: true })
  minSkillLevel: number;

  @Column({ type: 'float', nullable: true })
  maxSkillLevel: number;

  @Column({ type: 'int', nullable: true })
  teamSize: number;

  @ManyToOne(() => Team, (team) => team.teamVsTeamMatches, { nullable: false })
  team: Team;

  @ManyToOne(() => Team, (team) => team.opponentTeamVsTeamMatches, { nullable: true })
  opponentTeam: Team | null;

  @ManyToMany(() => Team, { nullable: true })
  @JoinTable({ name: 'match_pending_teams' })
  pendingTeams: Team[];
  @ManyToMany(() => Team, (team) => team.invitedTeamVsTeamMatches)
  @JoinTable()
  invitedTeams: Team[];
}