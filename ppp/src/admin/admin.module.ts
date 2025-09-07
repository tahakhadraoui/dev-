import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "../users/users.module";
import { ReservationsModule } from "../reservations/reservations.module";
import { FieldsModule } from "../fields/fields.module";
import { FullMatchModule } from "../matches/full-match/full-match.module";
import { IncompleteMatchModule } from "../matches/incomplete-match/incomplete-match.module";
import { TeamVsTeamMatchModule } from "../matches/team-vs-team-match/team-vs-team-match.module";
import { User } from "../users/entities/user.entity";
import { FullMatch } from "../matches/full-match/full-match.entity";
import { IncompleteMatch } from "../matches/incomplete-match/incomplete-match.entity";
import { TeamVsTeamMatch } from "../matches/team-vs-team-match/team-vs-team-match.entity";
import { Reservation } from "../reservations/entities/reservation.entity";
import { Field } from "../fields/entities/field.entity";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, FullMatch, IncompleteMatch, TeamVsTeamMatch, Reservation, Field]),
    UsersModule,
    ReservationsModule,
    FieldsModule,
    FullMatchModule,
    IncompleteMatchModule,
    TeamVsTeamMatchModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}