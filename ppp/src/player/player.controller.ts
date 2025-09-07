import { Controller, Get, UseGuards } from "@nestjs/common";
import { PlayerService } from "./player.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { GetUser } from "../common/decorators/get-user.decorator";
import { User } from "../users/entities/user.entity";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@ApiTags("player")
@Controller("player")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLAYER)
@ApiBearerAuth()
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get("dashboard")
  getDashboard(@GetUser() user: User) {
    return this.playerService.getDashboard(user.id);
  }

  @Get("matches/created")
  getCreatedMatches(@GetUser() user: User) {
    return this.playerService.getCreatedMatches(user.id);
  }

  @Get("matches/joined")
  getJoinedMatches(@GetUser() user: User) {
    return this.playerService.getJoinedMatches(user.id);
  }

  @Get("teams/captain")
  getCaptainedTeams(@GetUser() user: User) {
    return this.playerService.getCaptainedTeams(user.id);
  }

  @Get("teams/member")
  getMemberTeams(@GetUser() user: User) {
    return this.playerService.getMemberTeams(user.id);
  }

  @Get("ratings/received")
  getReceivedRatings(@GetUser() user: User) {
    return this.playerService.getReceivedRatings(user.id);
  }

  @Get("ratings/given")
  getGivenRatings(@GetUser() user: User) {
    return this.playerService.getGivenRatings(user.id, user);
  }

  @Get("profile")
  getProfile(@GetUser() user: User) {
    return this.playerService.getProfile(user.id);
  }
}