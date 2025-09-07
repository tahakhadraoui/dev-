import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsService } from './ratings.service';
import { Rating } from './entities/rating.entity';
import { UsersModule } from '../users/users.module';

import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsModule } from '../teams/teams.module';
import { TeamVsTeamMatchModule } from 'src/matches/team-vs-team-match/team-vs-team-match.module';
import { IncompleteMatchModule } from 'src/matches/incomplete-match/incomplete-match.module';
import { RatingsController } from './ratings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating]),
    UsersModule,
    forwardRef(() => TeamVsTeamMatchModule),
    IncompleteMatchModule,
    NotificationsModule,
    TeamsModule,
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}