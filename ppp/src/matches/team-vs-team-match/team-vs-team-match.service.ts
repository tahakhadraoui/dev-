import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamVsTeamMatch } from './team-vs-team-match.entity';
import { Team } from 'src/teams/entities/team.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { MatchStatus } from 'src/common/enums/match-status.enum';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';
import { CreateTeamVsTeamMatchDto } from './team-vs-team-match.dto/create-team-vs_team-match.dto';
import { UpdateTeamVsTeamMatchDto } from './team-vs-team-match.dto/update-team-vs-team-match.dto';
import { TeamJoinRequestDto } from './team-vs-team-match.dto/team-join-request.dto';
import { ApproveTeamJoinRequestDto } from './team-vs-team-match.dto/approve-team-join-request.dto';
import { InviteTeamDto } from './team-vs-team-match.dto/invite-team.dto';
import { RespondToInviteDto } from './team-vs-team-match.dto/team-invitation-response.dto';
import { FieldsService } from 'src/fields/fields.service';
import { TeamsService } from 'src/teams/teams.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Notification } from 'src/notifications/entities/notification.entity';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MatchType } from 'src/common/enums/match-type.enum';

export class UpdateTimeSlotDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID()
  matchId: string;

  @ApiProperty({ example: '2025-05-20T14:00:00Z' })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiProperty({ example: '14:00' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ example: '15:30' })
  @IsNotEmpty()
  @IsString()
  endTime: string;
}

@Injectable()
export class TeamVsTeamMatchService {
  constructor(
    @InjectRepository(TeamVsTeamMatch)
    private readonly matchRepo: Repository<TeamVsTeamMatch>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly fieldsService: FieldsService,
    private readonly teamsService: TeamsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }
    return hours * 60 + minutes;
  }

  // Helper method to check if user is team member (captain OR player)
  private isUserTeamMember(team: Team, userId: string): boolean {
    return team.captain.id === userId || team.players.some(p => p.id === userId);
  }

  async create(dto: CreateTeamVsTeamMatchDto, user: any): Promise<TeamVsTeamMatch> {
    const { teamIds, pendingTeamIds, creatorId, minSkillLevel, maxSkillLevel, teamSize, date, startTime, endTime, contactPhone, fieldId } = dto;

    // Validate creator
    if (creatorId !== user.id) throw new ForbiddenException('You must be the creator');

    // Validate teams - FIXED: Include captain relation
    if (teamIds.length !== 1) throw new BadRequestException('Exactly one team must be specified');
    const team = await this.teamRepo.findOne({ 
      where: { id: teamIds[0] }, 
      relations: ['players', 'captain']
    });
    if (!team) throw new NotFoundException(`Team with ID ${teamIds[0]} not found`);
    
    // FIXED: Check if user is either captain OR player
    if (!this.isUserTeamMember(team, user.id)) {
      throw new ForbiddenException('You are not a member of this team');
    }
    
    if (!(await this.teamsService.isTeamEligibleForMatch(team.id))) {
      throw new BadRequestException('Your team is not complete');
    }

    // Validate pending teams
    let pendingTeams: Team[] = [];
    if (pendingTeamIds && pendingTeamIds.length > 0) {
      pendingTeams = await this.teamRepo.find({ where: pendingTeamIds.map(id => ({ id })) });
      if (pendingTeams.length !== pendingTeamIds.length) {
        throw new NotFoundException('One or more pending teams not found');
      }
      for (const pendingTeam of pendingTeams) {
        if (pendingTeam.id === team.id) throw new BadRequestException('Cannot include own team in pending teams');
        if (!(await this.teamsService.isTeamEligibleForMatch(pendingTeam.id))) {
          throw new BadRequestException(`Pending team ${pendingTeam.id} is not complete`);
        }
        if (minSkillLevel && maxSkillLevel && pendingTeam.averageRating) {
          if (pendingTeam.averageRating < minSkillLevel || pendingTeam.averageRating > maxSkillLevel) {
            throw new BadRequestException(`Pending team ${pendingTeam.id} rating out of skill level range`);
          }
        }
      }
    }

    // Validate time slot
    const field = await this.fieldsService.findOne(fieldId);
    if (!field) throw new NotFoundException(`Field with ID ${fieldId} not found`);
    const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(fieldId, date);
    const isSlotAvailable = availableSlots.some(
      slot => slot.startTime === startTime && slot.endTime === endTime,
    );
    if (!isSlotAvailable) throw new BadRequestException('Selected time slot is not available');

    const startMinutes = this.timeToMinutes(dto.startTime);
    let endMinutes = this.timeToMinutes(dto.endTime);
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    const duration = endMinutes - startMinutes;
    if (duration < 75 || duration > 90) {
      throw new BadRequestException('Match duration must be between 75 and 90 minutes');
    }

    const match = this.matchRepo.create({
      title: dto.title,
      city: dto.city,
      description: dto.description || null,
      type: dto.type || MatchType.TEAM_VS_TEAM,
      contactPhone,
      date: new Date(date),
      startTime,
      endTime,
      isPublic: dto.isPublic,
      minAge: dto.minAge,
      maxAge: dto.maxAge,
      minSkillLevel,
      maxSkillLevel,
      teamSize,
      status: MatchStatus.PENDING,
      creator: { id: user.id },
      field: { id: fieldId },
      team,
      opponentTeam: null,
      pendingTeams,
      invitedTeams: [], // Initialize invitedTeams as empty
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedMatch = await this.matchRepo.save(match);

    // Create WAITING reservation
    const reservation = this.reservationRepo.create({
      date,
      startTime,
      endTime,
      reservedStatus: ReservationStatus.WAITING,
      phoneNumber: contactPhone,
      field: { id: fieldId },
      user: { id: user.id },
      teamVsTeamMatch: savedMatch,
      statusComment: 'Waiting for opponent team',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.reservationRepo.save(reservation);
    return savedMatch;
  }

  async findAll(): Promise<TeamVsTeamMatch[]> {
    return this.matchRepo.find({
      relations: [
        'team', 'team.captain', 'team.players',
        'opponentTeam', 'opponentTeam.captain', 'opponentTeam.players',
        'pendingTeams', 'pendingTeams.captain', 'pendingTeams.players',
        'invitedTeams', 'invitedTeams.captain', 'invitedTeams.players', // Added invitedTeams relations
        'creator', 'field', 'reservations'
      ],
    });
  }

  async findOne(id: string): Promise<TeamVsTeamMatch> {
    const match = await this.matchRepo.findOne({
      where: { id },
      relations: [
        'team', 'team.captain', 'team.players',
        'opponentTeam', 'opponentTeam.captain', 'opponentTeam.players',
        'pendingTeams', 'pendingTeams.captain', 'pendingTeams.players',
        'invitedTeams', 'invitedTeams.captain', 'invitedTeams.players', // Added invitedTeams relations
        'creator', 'field', 'reservations'
      ],
    });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  async update(id: string, dto: UpdateTeamVsTeamMatchDto, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(id);
    if (match.creator.id !== user.id) throw new ForbiddenException('Not the match creator');

    // Update only provided fields
    if (dto.title) match.title = dto.title;
    if (dto.city) match.city = dto.city;
    if (dto.description !== undefined) match.description = dto.description;
    if (dto.type) match.type = dto.type;
    if (dto.contactPhone) match.contactPhone = dto.contactPhone;
    if (dto.date) match.date = new Date(dto.date);
    if (dto.startTime) match.startTime = dto.startTime;
    if (dto.endTime) match.endTime = dto.endTime;
    if (dto.isPublic !== undefined) match.isPublic = dto.isPublic;
    if (dto.minAge !== undefined) match.minAge = dto.minAge;
    if (dto.maxAge !== undefined) match.maxAge = dto.maxAge;
    if (dto.minSkillLevel !== undefined) match.minSkillLevel = dto.minSkillLevel;
    if (dto.maxSkillLevel !== undefined) match.maxSkillLevel = dto.maxSkillLevel;
    if (dto.teamSize !== undefined) match.teamSize = dto.teamSize;

    // Handle team updates if provided
    if (dto.teamIds && dto.teamIds.length === 1) {
      const team = await this.teamRepo.findOne({ 
        where: { id: dto.teamIds[0] }, 
        relations: ['players', 'captain']
      });
      if (!team) throw new NotFoundException(`Team with ID ${dto.teamIds[0]} not found`);
      
      if (!this.isUserTeamMember(team, user.id)) {
        throw new ForbiddenException('You are not a member of this team');
      }
      
      if (!(await this.teamsService.isTeamEligibleForMatch(team.id))) {
        throw new BadRequestException('Team is not complete');
      }
      match.team = team;
    }

    if (dto.pendingTeamIds) {
      const pendingTeams = await this.teamRepo.find({ where: dto.pendingTeamIds.map(id => ({ id })) });
      if (pendingTeams.length !== dto.pendingTeamIds.length) {
        throw new NotFoundException('One or more pending teams not found');
      }
      for (const pendingTeam of pendingTeams) {
        if (!(await this.teamsService.isTeamEligibleForMatch(pendingTeam.id))) {
          throw new BadRequestException(`Pending team ${pendingTeam.id} is not complete`);
        }
      }
      match.pendingTeams = pendingTeams;
    }

    match.updatedAt = new Date();
    return this.matchRepo.save(match);
  }

  async remove(id: string, user: any): Promise<void> {
    const match = await this.findOne(id);
    if (match.creator.id !== user.id) throw new ForbiddenException('Not the match creator');
    const reservation = await this.reservationRepo.findOne({ where: { teamVsTeamMatch: { id } } });
    if (reservation) {
      reservation.reservedStatus = ReservationStatus.CANCELLED;
      reservation.statusComment = 'Reservation cancelled due to match removal';
      await this.reservationRepo.save(reservation);
      await this.reservationRepo.remove(reservation);
    }
    await this.matchRepo.remove(match);
  }

  async cancel(id: string, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(id);
    if (match.creator.id !== user.id) throw new ForbiddenException('Not the match creator');
    match.status = MatchStatus.CANCELLED;
    const reservation = await this.reservationRepo.findOne({ where: { teamVsTeamMatch: { id } } });
    if (reservation) {
      reservation.reservedStatus = ReservationStatus.CANCELLED;
      reservation.statusComment = 'Reservation cancelled by match creator';
      await this.reservationRepo.save(reservation);
    }
    match.updatedAt = new Date();
    return this.matchRepo.save(match);
  }

  async requestToJoin(dto: TeamJoinRequestDto, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(dto.matchId);
    const team = await this.teamRepo.findOne({
      where: { name: dto.teamName },
      relations: ['players', 'captain'],
    });
    if (!team) throw new NotFoundException('Team not found');
    
    if (!this.isUserTeamMember(team, user.id)) {
      throw new ForbiddenException('You are not a member of this team');
    }
    
    if (!(await this.teamsService.isTeamEligibleForMatch(team.id))) {
      throw new BadRequestException('Team is not complete');
    }
    if (match.team.id === team.id || match.opponentTeam?.id === team.id) {
      throw new BadRequestException('Team already joined');
    }
    if (match.pendingTeams.some(t => t.id === team.id)) {
      throw new BadRequestException('Join request already sent');
    }
    if (match.invitedTeams.some(t => t.id === team.id)) {
      throw new BadRequestException('Team already invited');
    }
    if (match.opponentTeam) {
      throw new BadRequestException('Match already has two teams');
    }
    if (match.minSkillLevel && match.maxSkillLevel && team.averageRating) {
      if (team.averageRating < match.minSkillLevel || team.averageRating > match.maxSkillLevel) {
        throw new BadRequestException('Team rating out of skill level range');
      }
    }

    match.pendingTeams.push(team);
    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);

    // Notify creator of join request
    if (match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Team Join Request',
        message: `Team ${team.name} has requested to join your match (${match.title}) on ${match.date} from ${match.startTime} to ${match.endTime}.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return savedMatch;
  }

  async approveJoinRequest(dto: ApproveTeamJoinRequestDto, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(dto.matchId);
    if (match.creator.id !== user.id) throw new ForbiddenException('Not the match creator');
    if (match.opponentTeam) {
      throw new BadRequestException('Match already has two teams');
    }

    const team = await this.teamRepo.findOne({ where: { id: dto.teamId } });
    if (!team) throw new NotFoundException('Team not found');
    if (!match.pendingTeams.some(t => t.id === team.id)) {
      throw new BadRequestException('Team not in pending list');
    }
    if (!(await this.teamsService.isTeamEligibleForMatch(team.id))) {
      throw new BadRequestException('Team is not complete');
    }

    match.opponentTeam = team;
    match.pendingTeams = match.pendingTeams.filter(t => t.id !== dto.teamId);
    match.invitedTeams = match.invitedTeams.filter(t => t.id !== dto.teamId); // Remove from invitedTeams if present
    match.status = MatchStatus.COMPLETED;
    const reservation = await this.reservationRepo.findOne({ where: { teamVsTeamMatch: { id: dto.matchId } } });
    if (reservation) {
      reservation.reservedStatus = ReservationStatus.PENDING;
      reservation.statusComment = 'Pending, awaiting owner approval';
      await this.reservationRepo.save(reservation);
    }

    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);

    // Notify creator of match completion
    if (match.creator && match.team && match.opponentTeam) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Match Completed',
        message: `Your match (${match.title}) is now completed with teams ${match.team.name} vs ${match.opponentTeam.name} on ${match.date} from ${match.startTime} to ${match.endTime}. The reservation is pending owner approval.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return savedMatch;
  }

  async declineJoinRequest(dto: ApproveTeamJoinRequestDto, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(dto.matchId);
    if (match.creator.id !== user.id) throw new ForbiddenException('Not the match creator');
    match.pendingTeams = match.pendingTeams.filter(t => t.id !== dto.teamId);
    match.updatedAt = new Date();
    return this.matchRepo.save(match);
  }

  async inviteTeam(dto: InviteTeamDto, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(dto.matchId);
    if (match.creator.id !== user.id) throw new ForbiddenException('Only the match creator can invite teams');
    if (match.opponentTeam) {
      throw new BadRequestException('Match already has two teams');
    }

    const team = await this.teamRepo.findOne({ 
      where: { name: dto.teamName },
      relations: ['captain', 'players'],
    });
    if (!team) throw new NotFoundException('Team not found');
    if (!(await this.teamsService.isTeamEligibleForMatch(team.id))) {
      throw new BadRequestException('Team is not complete');
    }
    if (match.invitedTeams.some(t => t.id === team.id)) {
      throw new BadRequestException('Team already invited');
    }
    if (match.pendingTeams.some(t => t.id === team.id)) {
      throw new BadRequestException('Team has already requested to join');
    }
    if (match.team.id === team.id) {
      throw new BadRequestException('Cannot invite own team');
    }
    if (match.minSkillLevel && match.maxSkillLevel && team.averageRating) {
      if (team.averageRating < match.minSkillLevel || team.averageRating > match.maxSkillLevel) {
        throw new BadRequestException('Team rating out of skill level range');
      }
    }

    match.invitedTeams.push(team);
    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);

    // Notify team captain of invitation
    if (team.captain) {
      await this.notificationsService.create({
        userId: team.captain.id,
        title: 'Match Invitation',
        message: `Your team ${team.name} has been invited to join match (${match.title}) on ${match.date} from ${match.startTime} to ${match.endTime}.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return savedMatch;
  }

  async respondToInvite(dto: RespondToInviteDto, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(dto.matchId);
    if (match.opponentTeam) {
      throw new BadRequestException('Match already has two teams');
    }

    // Find the team in invitedTeams where the user is the captain
    const team = match.invitedTeams.find(t => t.captain.id === user.id);
    if (!team) {
      throw new ForbiddenException('Only the team captain can respond to the invitation');
    }
    if (!(await this.teamsService.isTeamEligibleForMatch(team.id))) {
      throw new BadRequestException('Team is Rudolph is not complete');
    }

    if (dto.accept) {
      match.opponentTeam = team;
      match.invitedTeams = match.invitedTeams.filter(t => t.id !== team.id);
      match.pendingTeams = match.pendingTeams.filter(t => t.id !== team.id); // Remove from pendingTeams if present
      match.status = MatchStatus.COMPLETED;
      const reservation = await this.reservationRepo.findOne({ where: { teamVsTeamMatch: { id: dto.matchId } } });
      if (reservation) {
        reservation.reservedStatus = ReservationStatus.PENDING;
        reservation.statusComment = 'Pending, awaiting owner approval';
        await this.reservationRepo.save(reservation);
      }

      // Notify creator of match completion
      if (match.creator && match.team && match.opponentTeam) {
        await this.notificationsService.create({
          userId: match.creator.id,
          title: 'Match Invitation Accepted',
          message: `Team ${team.name} has accepted the invitation to join your match (${match.title}) on ${match.date} from ${match.startTime} to ${match.endTime}. The reservation is pending owner approval.`,
          type: 'match',
          relatedId: match.id,
        });
      }
    } else {
      match.invitedTeams = match.invitedTeams.filter(t => t.id !== team.id);
      
      // Notify creator of declined invitation
      if (match.creator) {
        await this.notificationsService.create({
          userId: match.creator.id,
          title: 'Match Invitation Declined',
          message: `Team ${team.name} has declined the invitation to join your match (${match.title}) on ${match.date} from ${match.startTime} to ${match.endTime}.`,
          type: 'match',
          relatedId: match.id,
        });
      }
    }

    match.updatedAt = new Date();
    return this.matchRepo.save(match);
  }

  async leaveMatch(matchId: string, teamId: string, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(matchId);
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['players', 'captain'],
    });
    if (!team) throw new NotFoundException('Team not found');
    
    if (!this.isUserTeamMember(team, user.id)) {
      throw new ForbiddenException('You are not a member of this team');
    }
    
    if (match.team.id !== teamId && match.opponentTeam?.id !== teamId) {
      throw new BadRequestException('Team is not part of the match');
    }

    if (match.team.id === teamId) {
      throw new BadRequestException('Creator\'s team cannot leave; cancel the match instead');
    }

    match.opponentTeam = null;
    match.status = MatchStatus.PENDING;
    const reservation = await this.reservationRepo.findOne({ where: { teamVsTeamMatch: { id: matchId } } });
    if (reservation) {
      reservation.reservedStatus = ReservationStatus.WAITING;
      reservation.statusComment = 'Waiting for opponent team';
      await this.reservationRepo.save(reservation);
    }

    match.updatedAt = new Date();
    return this.matchRepo.save(match);
  }

  async updateTimeSlot(dto: UpdateTimeSlotDto, user: any): Promise<TeamVsTeamMatch> {
    const match = await this.findOne(dto.matchId);
    if (match.creator.id !== user.id) {
      throw new ForbiddenException('Only creator can update time slot');
    }

    const field = await this.fieldsService.findOne(match.field.id);
    const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(field.id, dto.date);
    const isSlotAvailable = availableSlots.some(
      slot => slot.startTime === dto.startTime && slot.endTime === dto.endTime,
    );
    if (!isSlotAvailable) {
      throw new BadRequestException('Selected time slot is not available');
    }

    const startMinutes = this.timeToMinutes(dto.startTime);
    const endMinutes = this.timeToMinutes(dto.endTime);
    const duration = endMinutes - startMinutes;
    if (duration < 75 || duration > 90) {
      throw new BadRequestException('Match duration must be between 75 and 90 minutes');
    }

    const reservation = await this.reservationRepo.findOne({ where: { teamVsTeamMatch: { id: match.id } } });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    reservation.date = dto.date;
    reservation.startTime = dto.startTime;
    reservation.endTime = dto.endTime;
    reservation.updatedAt = new Date();

    match.date = new Date(dto.date);
    match.startTime = dto.startTime;
    match.endTime = dto.endTime;
    match.updatedAt = new Date();

    if (match.opponentTeam) {
      match.status = MatchStatus.COMPLETED;
      reservation.reservedStatus = ReservationStatus.PENDING;
      reservation.statusComment = 'Pending, awaiting owner approval';
    } else {
      match.status = MatchStatus.PENDING;
      reservation.reservedStatus = ReservationStatus.WAITING;
      reservation.statusComment = 'Waiting for opponent team';
    }

    await this.reservationRepo.save(reservation);

    // FIXED: Notify captain as well as players
    const notificationPromises: Promise<Notification>[] = [];
    if (match.team) {
      // Notify captain if not the creator
      if (match.team.captain.id !== match.creator.id) {
        notificationPromises.push(
          this.notificationsService.create({
            userId: match.team.captain.id,
            title: 'Match Time Updated',
            message: `The time for match (${match.title}) has been updated to ${dto.date} from ${dto.startTime} to ${dto.endTime}.`,
            type: 'match',
            relatedId: match.id,
          }),
        );
      }
      // Notify players
      for (const player of match.team.players) {
        if (player.id !== match.creator.id) {
          notificationPromises.push(
            this.notificationsService.create({
              userId: player.id,
              title: 'Match Time Updated',
              message: `The time for match (${match.title}) has been updated to ${dto.date} from ${dto.startTime} to ${dto.endTime}.`,
              type: 'match',
              relatedId: match.id,
            }),
          );
        }
      }
    }
    if (match.opponentTeam) {
      // Notify opponent captain if not the creator
      if (match.opponentTeam.captain.id !== match.creator.id) {
        notificationPromises.push(
          this.notificationsService.create({
            userId: match.opponentTeam.captain.id,
            title: 'Match Time Updated',
            message: `The time for match (${match.title}) has been updated to ${dto.date} from ${dto.startTime} to ${dto.endTime}.`,
            type: 'match',
            relatedId: match.id,
          }),
        );
      }
      // Notify opponent players
      for (const player of match.opponentTeam.players) {
        if (player.id !== match.creator.id) {
          notificationPromises.push(
            this.notificationsService.create({
              userId: player.id,
              title: 'Match Time Updated',
              message: `The time for match (${match.title}) has been updated to ${dto.date} from ${dto.startTime} to ${dto.endTime}.`,
              type: 'match',
              relatedId: match.id,
            }),
          );
        }
      }
    }
    await Promise.all(notificationPromises);

    return this.matchRepo.save(match);
  }
}