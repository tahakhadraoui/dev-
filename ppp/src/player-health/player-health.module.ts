import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerHealth } from './player-health.entity';
import { PlayerHealthService } from './player-health.service';
import { PlayerHealthController } from './player-health.controller';
import { User } from '../users/entities/user.entity';
import { FullMatch } from '../matches/full-match/full-match.entity';
import { IncompleteMatch } from '../matches/incomplete-match/incomplete-match.entity';
import { TeamVsTeamMatch } from '../matches/team-vs-team-match/team-vs-team-match.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerHealth, User, FullMatch, IncompleteMatch, TeamVsTeamMatch]),
    HttpModule,
  ],
  providers: [PlayerHealthService],
  controllers: [PlayerHealthController],
})
export class PlayerHealthModule {}