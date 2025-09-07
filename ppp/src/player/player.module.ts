import { Module } from "@nestjs/common";
import { PlayerService } from "./player.service";
import { PlayerController } from "./player.controller";
import { FullMatchModule } from "../matches/full-match/full-match.module";
import { IncompleteMatchModule } from "../matches/incomplete-match/incomplete-match.module";
import { TeamVsTeamMatchModule } from "../matches/team-vs-team-match/team-vs-team-match.module";
import { TeamsModule } from "../teams/teams.module";
import { RatingsModule } from "../ratings/ratings.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    FullMatchModule,
    IncompleteMatchModule,
    TeamVsTeamMatchModule,
    TeamsModule,
    RatingsModule,
    UsersModule,
  ],
  controllers: [PlayerController],
  providers: [PlayerService],
})
export class PlayerModule {}