import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TeamVsTeamMatch } from 'src/matches/team-vs-team-match/team-vs-team-match.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ type: 'float', default: 0 })
  averageRating: number;

  @Column({ default: 7 })
  teamSize: number;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @Column({ type: 'int', default: 0 })
  totalWins: number;

  @Column({ type: 'int', default: 0 })
  totalLosses: number;

  @Column({ type: 'int', default: 1 }) // Default to 1 to include the captain
  totalMembers: number;

  @ManyToOne(() => User, (user) => user.captainedTeams)
  captain: User;

  @ManyToMany(() => User, (user) => user.teams)
  @JoinTable()
  players: User[];

  @ManyToMany(() => TeamVsTeamMatch, (match) => match.team)
  @JoinTable()
  teamVsTeamMatches: TeamVsTeamMatch[];

  @ManyToMany(() => TeamVsTeamMatch, (match) => match.opponentTeam)
  @JoinTable()
  opponentTeamVsTeamMatches: TeamVsTeamMatch[];
  @ManyToMany(() => TeamVsTeamMatch, (match) => match.invitedTeams)
  invitedTeamVsTeamMatches: TeamVsTeamMatch[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  updateTotalMembers() {
    this.totalMembers = (this.players?.length || 0) + 1; // +1 for captain
  }
}