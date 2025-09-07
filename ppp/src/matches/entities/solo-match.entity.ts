/*import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseMatch } from './base-match.entity';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('solo_matches')
export class SoloMatch extends BaseMatch {
  constructor() {
    super();
    this.status = MatchStatus.PENDING;
    this.currentPlayers = 1;
    this.maxPlayers = 14;
  }

  @Column({ nullable: true })
  minAge: number;

  @Column({ nullable: true })
  maxAge: number;

  @Column({ type: 'float', nullable: true })
  minSkillLevel: number;

  @Column({ type: 'float', nullable: true })
  maxSkillLevel: number;

  @Column({ type: 'int', nullable: true })
  currentPlayers: number;

  @Column({ type: 'int', nullable: true })
  maxPlayers: number;
@ManyToMany(() => User, (user) => user.joinedMatch)
  @JoinTable()
  players: User[];
}*/
