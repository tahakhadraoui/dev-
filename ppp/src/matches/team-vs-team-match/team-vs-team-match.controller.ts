import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TeamVsTeamMatchService, UpdateTimeSlotDto } from './team-vs-team-match.service';
import { CreateTeamVsTeamMatchDto } from './team-vs-team-match.dto/create-team-vs_team-match.dto';
import { UpdateTeamVsTeamMatchDto } from './team-vs-team-match.dto/update-team-vs-team-match.dto';
import { TeamJoinRequestDto } from './team-vs-team-match.dto/team-join-request.dto';
import { ApproveTeamJoinRequestDto } from './team-vs-team-match.dto/approve-team-join-request.dto';
import { InviteTeamDto } from './team-vs-team-match.dto/invite-team.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { RespondToInviteDto } from './team-vs-team-match.dto/team-invitation-response.dto';

@ApiTags('team-vs-team-matches')
@Controller('team-vs-team-matches')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.PLAYER, UserRole.ADMIN)
export class TeamVsTeamMatchController {
  constructor(private readonly matchService: TeamVsTeamMatchService) {}

  @Post()
  create(@Body() dto: CreateTeamVsTeamMatchDto, @Request() req) {
    return this.matchService.create(dto, req.user);
  }

  @Get()
  findAll() {
    return this.matchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeamVsTeamMatchDto, @Request() req) {
    return this.matchService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.matchService.remove(id, req.user);
  }

  @Patch('cancel/:id')
  cancel(@Param('id') id: string, @Request() req) {
    return this.matchService.cancel(id, req.user);
  }

  @Post('join-request')
  requestToJoin(@Body() dto: TeamJoinRequestDto, @Request() req) {
    return this.matchService.requestToJoin(dto, req.user);
  }

  @Post('approve-join')
  approveJoin(@Body() dto: ApproveTeamJoinRequestDto, @Request() req) {
    return this.matchService.approveJoinRequest(dto, req.user);
  }

  @Post('decline-join')
  declineJoin(@Body() dto: ApproveTeamJoinRequestDto, @Request() req) {
    return this.matchService.declineJoinRequest(dto, req.user);
  }

  @Post('invite')
  inviteTeam(@Body() dto: InviteTeamDto, @Request() req) {
    return this.matchService.inviteTeam(dto, req.user);
  }

  @Post('respond-invite')
  respondToInvite(@Body() dto: RespondToInviteDto, @Request() req) {
    return this.matchService.respondToInvite(dto, req.user);
  }

  @Patch('leave/:matchId/:teamId')
  leaveMatch(
    @Param('matchId') matchId: string,
    @Param('teamId') teamId: string,
    @Request() req,
  ) {
    return this.matchService.leaveMatch(matchId, teamId, req.user);
  }

  @Patch('update-time-slot')
  updateTimeSlot(@Body() dto: UpdateTimeSlotDto, @Request() req) {
    return this.matchService.updateTimeSlot(dto, req.user);
  }
}