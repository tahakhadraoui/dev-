import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './entities/reservation.entity';
import { Field } from 'src/fields/entities/field.entity';
import { Terrain } from 'src/terrain/terrain.entity';
import { FullMatch } from 'src/matches/full-match/full-match.entity';
import { IncompleteMatch } from 'src/matches/incomplete-match/incomplete-match.entity';
import { TeamVsTeamMatch } from 'src/matches/team-vs-team-match/team-vs-team-match.entity';
import { FieldsService } from 'src/fields/fields.service';
import { TerrainsService } from 'src/terrain/terrain.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      Field,
      Terrain,
      FullMatch,
      IncompleteMatch,
      TeamVsTeamMatch,
    ]),
    NotificationsModule,
    UsersModule
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, FieldsService, TerrainsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}