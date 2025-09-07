import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { IncompleteMatch } from 'src/matches/incomplete-match/incomplete-match.entity';
import { TeamVsTeamMatch } from 'src/matches/team-vs-team-match/team-vs-team-match.entity';


@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.givenRatings)
  rater: User;

  @ManyToOne(() => User, (user) => user.receivedRatings)
  player: User;

  @ManyToOne(() => IncompleteMatch, { nullable: true })
  incompleteMatch: IncompleteMatch | null;

  @ManyToOne(() => TeamVsTeamMatch, { nullable: true })
  teamVsTeamMatch: TeamVsTeamMatch | null;

  @Column({ type: 'int' })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}