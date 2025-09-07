import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddPlayerDto } from './dto/add-player.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Team } from './entities/team.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('teams')
@Controller('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created', type: Team })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiBody({ type: CreateTeamDto })
  async create(@Body() createTeamDto: CreateTeamDto, @Request() req): Promise<Team> {
    return await this.teamsService.create(createTeamDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams' })
  @ApiResponse({ status: 200, description: 'List of teams', type: [Team] })
  async findAll(): Promise<Team[]> {
    return await this.teamsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a team by ID' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team found', type: Team })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOne(@Param('id') id: string): Promise<Team> {
    return await this.teamsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team updated', type: Team })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiBody({ type: UpdateTeamDto })
  async update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @Request() req,
  ): Promise<Team> {
    return await this.teamsService.update(id, updateTeamDto, req.user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 204, description: 'Team deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    await this.teamsService.remove(id, req.user);
  }

  @Post(':teamId/players')
  @ApiOperation({ summary: 'Add a player to a team' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: 201, description: 'Player added', type: Team })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiBody({ type: AddPlayerDto })
  async addPlayer(
    @Param('teamId') teamId: string,
    @Body() addPlayerDto: AddPlayerDto,
    @Request() req,
  ): Promise<Team> {
    return await this.teamsService.addPlayer(teamId, addPlayerDto, req.user);
  }

  @Delete(':teamId/players/:playerId')
  @ApiOperation({ summary: 'Remove a player from a team' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiParam({ name: 'playerId', description: 'Player ID' })
  @ApiResponse({ status: 200, description: 'Player removed', type: Team })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async removePlayer(
    @Param('teamId') teamId: string,
    @Param('playerId') playerId: string,
    @Request() req,
  ): Promise<Team> {
    return await this.teamsService.removePlayer(teamId, playerId, req.user);
  }

  @Post(':teamId/leave')
  @ApiOperation({ summary: 'Leave a team' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Left team', type: Team })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async leaveTeam(@Param('teamId') teamId: string, @Request() req): Promise<Team> {
    return await this.teamsService.leaveTeam(teamId, req.user);
  }

  @Get('captained/me')
  @ApiOperation({ summary: 'Get teams captained by the user' })
  @ApiResponse({ status: 200, description: 'List of captained teams', type: [Team] })
  async findCaptainedTeams(@Request() req): Promise<Team[]> {
    return await this.teamsService.findCaptainedTeams(req.user.id);
  }

  @Get('member/me')
  @ApiOperation({ summary: 'Get teams the user is a member of' })
  @ApiResponse({ status: 200, description: 'List of member teams', type: [Team] })
  async findMemberTeams(@Request() req): Promise<Team[]> {
    return await this.teamsService.findMemberTeams(req.user.id);
  }

  @Post(':teamId/transfer-captaincy/:newCaptainId')
  @ApiOperation({ summary: 'Transfer team captaincy' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiParam({ name: 'newCaptainId', description: 'New Captain ID' })
  @ApiResponse({ status: 200, description: 'Captaincy transferred', type: Team })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async transferCaptaincy(
    @Param('teamId') teamId: string,
    @Param('newCaptainId') newCaptainId: string,
    @Request() req,
  ): Promise<Team> {
    return await this.teamsService.transferCaptaincy(teamId, newCaptainId, req.user.id);
  }
}