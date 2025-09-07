import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Team } from './entities/team.entity';
import { User } from '../users/entities/user.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddPlayerDto } from './dto/add-player.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private updateTeamStatus(team: Team): void {
    const totalMembers = team.players.length + 1; // +1 for captain
    team.isComplete = totalMembers === team.teamSize;
    const allMembers = [team.captain, ...team.players];
    team.averageRating = allMembers.reduce((sum, member) => sum + (member.averageRating || 0), 0) / allMembers.length;
  }

  async create(createTeamDto: CreateTeamDto, captainId: string): Promise<Team> {
    console.log('Creating team with DTO:', createTeamDto);
    console.log('Captain ID:', captainId);

    const captain = await this.userRepository.findOne({
      where: { id: captainId },
      relations: ['captainedTeams'],
    });

    if (!captain) {
      throw new NotFoundException('Captain not found');
    }

    if (captain.captainedTeams && captain.captainedTeams.length > 0) {
      throw new BadRequestException('User is already captaining a team');
    }

    if (createTeamDto.teamSize < 6) {
      throw new BadRequestException('Team size must be at least 6 players');
    }

    if (createTeamDto.playerIds.length !== createTeamDto.teamSize - 1) {
      throw new BadRequestException(
        `You must select exactly ${createTeamDto.teamSize - 1} players (excluding captain)`,
      );
    }

    const players = await this.userRepository.find({
      where: { id: In(createTeamDto.playerIds) },
    });

    if (players.length !== createTeamDto.playerIds.length) {
      throw new BadRequestException('Some selected players were not found');
    }

    const invalidPlayers = players.filter(player => !player.isActive || player.role !== UserRole.PLAYER);
    if (invalidPlayers.length > 0) {
      throw new BadRequestException('All selected players must be active and have PLAYER role');
    }

    if (createTeamDto.playerIds.includes(captainId)) {
      throw new BadRequestException('Captain cannot be added as a regular player');
    }

    const team = this.teamRepository.create({
      name: createTeamDto.name,
      description: createTeamDto.description,
      logo: createTeamDto.logo,
      teamSize: createTeamDto.teamSize,
      captain: captain,
      players: players,
    });

    this.updateTeamStatus(team);

    console.log('Saving team:', {
      name: team.name,
      teamSize: team.teamSize,
      playersCount: team.players.length + 1,
      isComplete: team.isComplete,
    });

    const savedTeam = await this.teamRepository.save(team);

    for (const player of players) {
      await this.notificationsService.create({
        userId: player.id,
        title: 'Team Invitation',
        message: `You have been added to the team "${team.name}"`,
        type: 'team_invitation',
        relatedId: savedTeam.id,
      });
    }

    if (savedTeam.isComplete) {
      await this.notifyTeamComplete(savedTeam);
      await this.notificationsService.create({
        userId: captainId,
        title: 'Team Complete',
        message: `The team "${savedTeam.name}" is now complete with ${savedTeam.teamSize} players.`,
        type: 'team_complete',
        relatedId: savedTeam.id,
      });
    }

    return await this.findOne(savedTeam.id);
  }

  async update(id: string, updateTeamDto: UpdateTeamDto, currentUser: User): Promise<Team> {
    console.log('Updating team:', id, 'with data:', updateTeamDto);

    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['captain', 'players'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.captain.id !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only team captain or admin can update the team');
    }

    if (updateTeamDto.teamSize && updateTeamDto.teamSize < 6) {
      throw new BadRequestException('Team size must be at least 6 players');
    }

    if (updateTeamDto.teamSize && team.players.length + 1 > updateTeamDto.teamSize) {
      throw new BadRequestException('Cannot reduce team size below current player count');
    }

    Object.assign(team, updateTeamDto);
    this.updateTeamStatus(team);

    console.log('Team status after update:', {
      teamSize: team.teamSize,
      totalMembers: team.players.length + 1,
      isComplete: team.isComplete,
      playersNeeded: team.teamSize - (team.players.length + 1),
    });

    const updatedTeam = await this.teamRepository.save(team);

    if (updatedTeam.isComplete && !team.isComplete) {
      await this.notifyTeamComplete(updatedTeam);
      await this.notificationsService.create({
        userId: team.captain.id,
        title: 'Team Complete',
        message: `The team "${updatedTeam.name}" is now complete with ${updatedTeam.teamSize} players.`,
        type: 'team_complete',
        relatedId: updatedTeam.id,
      });
    }

    return await this.findOne(updatedTeam.id);
  }

  async addPlayer(teamId: string, addPlayerDto: AddPlayerDto, currentUser: User): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['captain', 'players'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.captain.id !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only team captain or admin can add players');
    }

    if (team.isComplete) {
      throw new BadRequestException('Team is already complete');
    }

    const currentMembers = team.players.length + 1; // +1 for captain
    if (currentMembers >= team.teamSize) {
      throw new BadRequestException('Team is already at maximum capacity');
    }

    const player = await this.userRepository.findOne({
      where: { id: addPlayerDto.playerId },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (!player.isActive || player.role !== UserRole.PLAYER) {
      throw new BadRequestException('Player must be active and have PLAYER role');
    }

    const isAlreadyMember = team.players.some(p => p.id === player.id) || team.captain.id === player.id;
    if (isAlreadyMember) {
      throw new BadRequestException('Player is already a member of this team');
    }

    team.players.push(player);
    this.updateTeamStatus(team);

    await this.teamRepository.save(team);

    await this.notificationsService.create({
      userId: player.id,
      title: 'Team Invitation',
      message: `You have been added to the team "${team.name}"`,
      type: 'team_invitation',
      relatedId: team.id,
    });

    if (team.isComplete) {
      await this.notifyTeamComplete(team);
      await this.notificationsService.create({
        userId: team.captain.id,
        title: 'Team Complete',
        message: `The team "${team.name}" is now complete with ${team.teamSize} players.`,
        type: 'team_complete',
        relatedId: team.id,
      });
    }

    return await this.findOne(team.id);
  }

  async removePlayer(teamId: string, playerId: string, currentUser: User): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['captain', 'players'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.captain.id !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only team captain or admin can remove players');
    }

    if (team.captain.id === playerId) {
      throw new BadRequestException('Cannot remove team captain');
    }

    const playerIndex = team.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new NotFoundException('Player not found in team');
    }

    const removedPlayer = team.players[playerIndex];
    team.players.splice(playerIndex, 1);
    this.updateTeamStatus(team);

    await this.teamRepository.save(team);

    await this.notificationsService.create({
      userId: playerId,
      title: 'Team Removal',
      message: `You have been removed from the team "${team.name}"`,
      type: 'team_removal',
      relatedId: team.id,
    });

    const playersNeeded = team.teamSize - (team.players.length + 1);
    await this.notificationsService.create({
      userId: team.captain.id,
      title: 'Player Removed',
      message: `Player removed from "${team.name}". ${playersNeeded} more player(s) needed to complete the team.`,
      type: 'team_player_removed',
      relatedId: team.id,
    });

    return await this.findOne(team.id);
  }

  async findAll(): Promise<Team[]> {
    const teams = await this.teamRepository.find({
      relations: ['captain', 'players'],
      order: { createdAt: 'DESC' },
    });

    return teams.map(team => {
      team.totalMembers = (team.players?.length || 0) + 1; // +1 for captain
      return team;
    });
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['captain', 'players'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    team.totalMembers = (team.players?.length || 0) + 1; // +1 for captain
    return team;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['captain', 'teamVsTeamMatches'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.captain.id !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only team captain or admin can delete the team');
    }

    if (team.teamVsTeamMatches && team.teamVsTeamMatches.length > 0) {
      throw new BadRequestException('Cannot delete team with active matches');
    }

    await this.teamRepository.remove(team);
  }

  async leaveTeam(teamId: string, currentUser: User): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['captain', 'players'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.captain.id === currentUser.id) {
      throw new BadRequestException('Captain cannot leave team. Transfer captaincy first.');
    }

    const playerIndex = team.players.findIndex(p => p.id === currentUser.id);
    if (playerIndex === -1) {
      throw new BadRequestException('You are not a member of this team');
    }

    const removedPlayer = team.players[playerIndex];
    team.players.splice(playerIndex, 1);
    this.updateTeamStatus(team);

    await this.teamRepository.save(team);

    const playersNeeded = team.teamSize - (team.players.length + 1);
    await this.notificationsService.create({
      userId: team.captain.id,
      title: 'Player Left Team',
      message: `${removedPlayer.firstName} ${removedPlayer.lastName} has left "${team.name}". ${playersNeeded} more player(s) needed to complete the team.`,
      type: 'team_player_left',
      relatedId: team.id,
    });

    return await this.findOne(team.id);
  }

  async findCaptainedTeams(captainId: string): Promise<Team[]> {
    const teams = await this.teamRepository.find({
      where: { captain: { id: captainId } },
      relations: ['captain', 'players'],
      order: { createdAt: 'DESC' },
    });

    return teams.map(team => {
      team.totalMembers = (team.players?.length || 0) + 1; // +1 for captain
      return team;
    });
  }

  async findMemberTeams(userId: string): Promise<Team[]> {
    const teams = await this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.captain', 'captain')
      .leftJoinAndSelect('team.players', 'players')
      .where('players.id = :userId', { userId })
      .getMany();

    return teams.map(team => {
      team.totalMembers = (team.players?.length || 0) + 1; // +1 for captain
      return team;
    });
  }

  async transferCaptaincy(teamId: string, newCaptainId: string, currentCaptainId: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['captain', 'players'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.captain.id !== currentCaptainId && (await this.userRepository.findOne({ where: { id: currentCaptainId } }))?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only current captain or admin can transfer captaincy');
    }

    const newCaptain = team.players.find(p => p.id === newCaptainId);
    if (!newCaptain) {
      throw new BadRequestException('New captain must be a member of the team');
    }

    const newCaptainData = await this.userRepository.findOne({
      where: { id: newCaptainId },
      relations: ['captainedTeams'],
    });
    if (!newCaptainData) {
      throw new NotFoundException('New captain not found');
    }
    if (newCaptainData.captainedTeams && newCaptainData.captainedTeams.length > 0) {
      throw new BadRequestException('New captain is already captaining another team');
    }

    team.players = team.players.filter(p => p.id !== newCaptainId);
    team.players.push(team.captain);
    team.captain = newCaptain;
    this.updateTeamStatus(team);

    await this.teamRepository.save(team);

    await this.notificationsService.create({
      userId: newCaptainId,
      title: 'Team Captaincy',
      message: `You are now the captain of the team "${team.name}"`,
      type: 'team_captaincy',
      relatedId: team.id,
    });

    if (currentCaptainId !== newCaptainId) {
      await this.notificationsService.create({
        userId: currentCaptainId,
        title: 'Team Captaincy Transfer',
        message: `You have transferred captaincy of the team "${team.name}" to ${newCaptain.firstName} ${newCaptain.lastName}`,
        type: 'team_captaincy_transfer',
        relatedId: team.id,
      });
    }

    return await this.findOne(team.id);
  }

  async isTeamEligibleForMatch(teamId: string): Promise<boolean> {
    const team = await this.findOne(teamId);
    return team.isComplete;
  }

  private async notifyTeamComplete(team: Team): Promise<void> {
    for (const player of team.players) {
      await this.notificationsService.create({
        userId: player.id,
        title: 'Team Complete',
        message: `The team "${team.name}" is now complete with ${team.teamSize} players`,
        type: 'team_complete',
        relatedId: team.id,
      });
    }
  }
}