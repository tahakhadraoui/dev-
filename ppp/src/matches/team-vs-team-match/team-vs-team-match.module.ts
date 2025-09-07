import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamVsTeamMatch } from './team-vs-team-match.entity';
import { Team } from 'src/teams/entities/team.entity';
import { Field } from 'src/fields/entities/field.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { TeamVsTeamMatchController } from './team-vs-team-match.controller';
import { TeamVsTeamMatchService } from './team-vs-team-match.service';
import { FieldsService } from 'src/fields/fields.service';
import { FieldsModule } from 'src/fields/fields.module';
import { TeamsService } from 'src/teams/teams.service';
import { TeamsModule } from 'src/teams/teams.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { UsersModule } from 'src/users/users.module';
import { TerrainModule } from 'src/terrain/terrain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamVsTeamMatch, Team, Field, Reservation]),
    FieldsModule,
    TerrainModule,
    TeamsModule,
    NotificationsModule,
    forwardRef(() => FieldsModule), 
    forwardRef(() => UsersModule),
  ],
  controllers: [TeamVsTeamMatchController],
  providers: [TeamVsTeamMatchService, FieldsService, TeamsService],
  exports: [TeamVsTeamMatchService],
})
export class TeamVsTeamMatchModule {}