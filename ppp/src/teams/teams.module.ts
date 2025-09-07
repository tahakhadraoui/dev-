import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeamsService } from "./teams.service";
import { Team } from "./entities/team.entity";
import { UsersModule } from "../users/users.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TeamVsTeamMatch } from "src/matches/team-vs-team-match/team-vs-team-match.entity";
import { TeamsController } from "./teams.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamVsTeamMatch]),
    forwardRef(() => TeamVsTeamMatch),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
