import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncompleteMatch } from './incomplete-match.entity';
import { CreateIncompleteMatchDto } from './incomplete-match.dtos/create-incomplete-match.dto';
import { JoinRequestDto } from './incomplete-match.dtos/join-request.dto';
import { ApproveJoinRequestDto } from './incomplete-match.dtos/approve-join-request.dto';
import { InvitePlayerDto } from './incomplete-match.dtos/invite-player.dto';
import { UpdateIncompleteMatchDto } from './incomplete-match.dtos/update-incomplete-match.dto';
import { IncompleteMatchResponseDto, UserResponseDto, FieldResponseDto, ReservationResponseDto } from './incomplete-match.dtos/incomplete-match-response-dto';
import { User } from 'src/users/entities/user.entity';
import { MatchStatus } from 'src/common/enums/match-status.enum';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { FieldsService } from 'src/fields/fields.service';
import { ReservationsService } from 'src/reservations/reservations.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';
import { UpdateTimeslotDto } from './incomplete-match.dtos/update-time-slot.dto';

@Injectable()
export class IncompleteMatchService {
  constructor(
    @InjectRepository(IncompleteMatch)
    private readonly matchRepo: Repository<IncompleteMatch>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly fieldsService: FieldsService,
    private readonly reservationsService: ReservationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }
    return hours * 60 + minutes;
  }

  private mapToResponseDto(match: IncompleteMatch): IncompleteMatchResponseDto {
    return {
      id: match.id,
      type: match.type,
      title: match.title,
      city: match.city,
      description: match.description,
      status: match.status,
      contactPhone: match.contactPhone,
      date: match.date,
      startTime: match.startTime,
      endTime: match.endTime,
      isPublic: match.isPublic,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
      creator: {
        id: match.creator.id,
        firstName: match.creator.firstName,
        lastName: match.creator.lastName,
      },
      field: {
        id: match.field.id,
        name: match.field.name,
        address: match.field.address,
        city: match.field.city,
      },
      reservations: match.reservations.map(res => ({
        id: res.id,
        date: res.date,
        startTime: res.startTime,
        endTime: res.endTime,
        reservedStatus: res.reservedStatus,
        statusComment: res.statusComment,
      })),
      minAge: match.minAge,
      maxAge: match.maxAge,
      minSkillLevel: match.minSkillLevel,
      maxSkillLevel: match.maxSkillLevel,
      initialCurrentPlayers: match.initialCurrentPlayers,
      currentPlayers: match.currentPlayers,
      maxPlayers: match.maxPlayers,
      requiresApproval: match.requiresApproval,
      players: match.players.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
      })),
      pendingPlayers: match.pendingPlayers.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
      })),
      invitedPlayers: match.invitedPlayers.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
      })),
    };
  }

  async create(dto: CreateIncompleteMatchDto, user: User): Promise<IncompleteMatchResponseDto> {
    if (dto.currentPlayers && dto.currentPlayers < 1) {
      throw new BadRequestException('Initial currentPlayers must be at least 2');
    }
    if (dto.maxPlayers > 16) {
      throw new BadRequestException('maxPlayers must be at most 16');
    }
    if (dto.currentPlayers && dto.maxPlayers && dto.currentPlayers > dto.maxPlayers) {
      throw new BadRequestException('currentPlayers cannot exceed maxPlayers');
    }

    // Validate time slot
    const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(dto.fieldId, dto.date);
    const isSlotAvailable = availableSlots.some(
      slot => slot.startTime === dto.startTime && slot.endTime === dto.endTime,
    );
    if (!isSlotAvailable) {
      throw new BadRequestException('Selected time slot is not available');
    }

    // Validate duration (75–90 minutes)
    const startMinutes = this.timeToMinutes(dto.startTime);
    const endMinutes = this.timeToMinutes(dto.endTime);
    const duration = endMinutes - startMinutes;
    if (duration < 75 || duration > 90) {
      throw new BadRequestException('Match duration must be between 75 and 90 minutes');
    }

    const field = await this.fieldsService.findOne(dto.fieldId);
    if (!field) throw new NotFoundException(`Field with ID ${dto.fieldId} not found`);
    if (dto.creatorFullName && dto.creatorFullName !== `${user.firstName} ${user.lastName}`) {
      throw new BadRequestException('Creator full name does not match authenticated user');
    }

    const currentPlayers = dto.currentPlayers || 2;
    const maxPlayers = dto.maxPlayers || 16;

    const match = this.matchRepo.create({
      ...dto,
      creator: user,
      initialCurrentPlayers: currentPlayers,
      currentPlayers: currentPlayers,
      maxPlayers,
      players: [user],
      pendingPlayers: [],
      invitedPlayers: [],
      status: currentPlayers === maxPlayers ? MatchStatus.COMPLETED : MatchStatus.PENDING,
      field,
      contactPhone: dto.contactPhone,
      minAge: dto.minAge,
      maxAge: dto.maxAge,
      minSkillLevel: dto.minSkillLevel,
      maxSkillLevel: dto.maxSkillLevel,
      requiresApproval: dto.requiresApproval || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedMatch = await this.matchRepo.save(match);

    // Create reservation
    const reservation = this.reservationRepo.create({
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      reservedStatus: match.currentPlayers === match.maxPlayers ? ReservationStatus.PENDING : ReservationStatus.WAITING,
      phoneNumber: dto.contactPhone,
      field,
      user,
      incompleteMatch: savedMatch,
      createdAt: new Date(),
      updatedAt: new Date(),
      statusComment: match.currentPlayers === match.maxPlayers ? 'Pending, awaiting owner approval' : 'Waiting for more players',
    });

    await this.reservationRepo.save(reservation);

    // Notify creator if match is completed
    if (match.currentPlayers === match.maxPlayers && match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Match Completed',
        message: `Your match (${savedMatch.title}) is now completed with ${match.currentPlayers} players on ${match.date} from ${match.startTime} to ${match.endTime}. The reservation is pending owner approval.`,
        type: 'match',
        relatedId: savedMatch.id,
      });
    }

    const matchWithRelations = await this.matchRepo.findOne({
      where: { id: savedMatch.id },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });

    if (!matchWithRelations) throw new NotFoundException('Match not found after creation');

    return this.mapToResponseDto(matchWithRelations);
  }

  async findAll(): Promise<IncompleteMatchResponseDto[]> {
    const matches = await this.matchRepo.find({
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    return matches.map(match => this.mapToResponseDto(match));
  }

  async findOne(id: string): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');
    return this.mapToResponseDto(match);
  }

  async requestToJoin(dto: JoinRequestDto, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: dto.matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    if (
      match.players.some(p => p.id === user.id) ||
      match.pendingPlayers.some(p => p.id === user.id) ||
      match.invitedPlayers.some(p => p.id === user.id)
    ) {
      throw new BadRequestException('Already joined, requested, or invited');
    }
    if (match.status === MatchStatus.COMPLETED || match.currentPlayers >= match.maxPlayers) {
      throw new BadRequestException('Match is full or already completed');
    }
    if (match.minAge && dto.age < match.minAge) {
      throw new BadRequestException(`You must be at least ${match.minAge} years old`);
    }
    if (match.maxAge && dto.age > match.maxAge) {
      throw new BadRequestException(`You must be at most ${match.maxAge} years old`);
    }
    if (match.minSkillLevel && dto.skillLevel < match.minSkillLevel) {
      throw new BadRequestException(`Skill level must be at least ${match.minSkillLevel}`);
    }
    if (match.maxSkillLevel && dto.skillLevel > match.maxSkillLevel) {
      throw new BadRequestException(`Skill level must be at most ${match.maxSkillLevel}`);
    }

    match.pendingPlayers.push(user);
    match.updatedAt = new Date();

    const savedMatch = await this.matchRepo.save(match);

    // Notify creator of join request
    if (match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'New Join Request',
        message: `User ${user.lastName || user.id} has requested to join your match (${match.title}) on ${match.date} from ${match.startTime} to ${match.endTime}.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return this.mapToResponseDto(savedMatch);
  }

  async approveJoinRequest(dto: ApproveJoinRequestDto, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: dto.matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    if (match.creator.id !== user.id) {
      throw new ForbiddenException('Only creator can approve');
    }
    if (match.status === MatchStatus.COMPLETED || match.currentPlayers >= match.maxPlayers) {
      throw new BadRequestException('Match is full or already completed');
    }

    const pending = match.pendingPlayers.find(p => p.id === dto.playerId);
    if (!pending) {
      throw new BadRequestException('No such pending request');
    }

    match.pendingPlayers = match.pendingPlayers.filter(p => p.id !== dto.playerId);
    match.players.push(pending);
    match.currentPlayers++;

    let reservation: Reservation | null = null;
    if (match.currentPlayers === match.maxPlayers) {
      match.status = MatchStatus.COMPLETED;
      reservation = await this.reservationRepo.findOne({ where: { incompleteMatch: { id: match.id } } });
      if (reservation) {
        reservation.reservedStatus = ReservationStatus.PENDING;
        reservation.statusComment = 'Pending, awaiting owner approval';
        await this.reservationRepo.save(reservation);
      }
    }

    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);

    // Notify creator if match is completed
    if (match.currentPlayers === match.maxPlayers && match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Match Completed',
        message: `Your match (${match.title}) is now completed with ${match.maxPlayers} players on ${match.date} from ${match.startTime} to ${match.endTime}. The reservation is pending owner approval.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return this.mapToResponseDto(savedMatch);
  }

  async declineJoinRequest(dto: ApproveJoinRequestDto, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: dto.matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    if (match.creator.id !== user.id) {
      throw new ForbiddenException('Only creator can decline');
    }
    match.pendingPlayers = match.pendingPlayers.filter(p => p.id !== dto.playerId);
    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);
    return this.mapToResponseDto(savedMatch);
  }

  async invitePlayer(dto: InvitePlayerDto, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: dto.matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    if (match.creator.id !== user.id) {
      throw new ForbiddenException('Only creator can invite');
    }
    if (match.status === MatchStatus.COMPLETED || match.currentPlayers >= match.maxPlayers) {
      throw new BadRequestException('Match is full or already completed');
    }
    if (match.players.some(p => p.id === dto.playerId)) {
      throw new BadRequestException('Player already joined');
    }
    if (match.pendingPlayers.some(p => p.id === dto.playerId)) {
      throw new BadRequestException('Player has a pending join request');
    }
    if (match.invitedPlayers.some(p => p.id === dto.playerId)) {
      throw new BadRequestException('Player already invited');
    }

    const invitedPlayer = await this.userRepo.findOne({ where: { id: dto.playerId } });
    if (!invitedPlayer) {
      throw new NotFoundException('User not found');
    }

    match.invitedPlayers.push(invitedPlayer);
    match.updatedAt = new Date();

    const savedMatch = await this.matchRepo.save(match);

    await this.notificationsService.create({
      userId: invitedPlayer.id,
      title: 'Match Invitation',
      message: `You have been invited to join the match "${match.title}"  on ${match.date} from ${match.startTime} to ${match.endTime}. Please accept or decline the invitation.`,
      type: 'match',
      relatedId: match.id,
    });

    return this.mapToResponseDto(savedMatch);
  }

  async acceptInvitation(matchId: string, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    const isInvited = match.invitedPlayers.some(p => p.id === user.id);
    if (!isInvited) {
      throw new BadRequestException('You were not invited to this match');
    }

    if (match.status === MatchStatus.COMPLETED || match.currentPlayers >= match.maxPlayers) {
      throw new BadRequestException('Match is full or already completed');
    }
    if (match.players.some(p => p.id === user.id)) {
      throw new BadRequestException('You are already a player in this match');
    }

    match.invitedPlayers = match.invitedPlayers.filter(p => p.id !== user.id);
    match.players.push(user);
    match.currentPlayers++;

    let reservation: Reservation | null = null;
    if (match.currentPlayers === match.maxPlayers) {
      match.status = MatchStatus.COMPLETED;
      reservation = await this.reservationRepo.findOne({ where: { incompleteMatch: { id: match.id } } });
      if (reservation) {
        reservation.reservedStatus = ReservationStatus.PENDING;
        reservation.statusComment = 'Pending, awaiting owner approval';
        await this.reservationRepo.save(reservation);
      }
    }

    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);

    if (match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Invitation Accepted',
        message: `User ${user.lastName || user.firstName} has accepted the invitation to join your match (${match.title}) on ${match.date} from ${match.startTime} to ${match.endTime}.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    if (match.currentPlayers === match.maxPlayers && match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Match Completed',
        message: `Your match (${match.title}) is now completed with ${match.maxPlayers} players on ${match.date} from ${match.startTime} to ${match.endTime}. The reservation is pending owner approval.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return this.mapToResponseDto(savedMatch);
  }

  async declineInvitation(matchId: string, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    const isInvited = match.invitedPlayers.some(p => p.id === user.id);
    if (!isInvited) {
      throw new BadRequestException('You were not invited to this match');
    }

    match.invitedPlayers = match.invitedPlayers.filter(p => p.id !== user.id);
    match.updatedAt = new Date();

    const savedMatch = await this.matchRepo.save(match);

    if (match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Invitation Declined',
        message: `User ${user.lastName || user.firstName} has declined the invitation to join your match (${match.id}) on ${match.date} from ${match.startTime} to ${match.endTime}.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return this.mapToResponseDto(savedMatch);
  }

  async updateTimeSlot(dto: UpdateTimeslotDto, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: dto.matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

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

    const reservation = await this.reservationRepo.findOne({ where: { incompleteMatch: { id: match.id } } });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    reservation.date = new Date(dto.date).toISOString();
    reservation.startTime = dto.startTime;
    reservation.endTime = dto.endTime;
    reservation.updatedAt = new Date();

    match.date = new Date(dto.date).toISOString();
    match.startTime = dto.startTime;
    match.endTime = dto.endTime;
    match.updatedAt = new Date();

    if (match.currentPlayers === match.maxPlayers) {
      match.status = MatchStatus.COMPLETED;
      reservation.reservedStatus = ReservationStatus.PENDING;
      reservation.statusComment = 'Pending, awaiting owner approval';
    } else {
      match.status = MatchStatus.PENDING;
      reservation.reservedStatus = ReservationStatus.WAITING;
      reservation.statusComment = 'Waiting for more players';
    }

    await this.reservationRepo.save(reservation);
    const savedMatch = await this.matchRepo.save(match);

    if (match.players && match.creator) {
      for (const player of match.players) {
        if (player.id !== match.creator.id) {
          await this.notificationsService.create({
            userId: player.id,
            title: 'Match Time Updated',
            message: `The time for match (${match.title}) has been updated to ${dto.date} from ${dto.startTime} to ${dto.endTime}.`,
            type: 'match',
            relatedId: match.id,
          });
        }
      }
    }

    return this.mapToResponseDto(savedMatch);
  }

  async leaveMatch(matchId: string, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    const isPlayer = match.players.some(p => p.id === user.id);
    if (!isPlayer) {
      throw new BadRequestException('You are not a player in this match');
    }

    match.players = match.players.filter(p => p.id !== user.id);
    match.currentPlayers--;

    const reservation = await this.reservationRepo.findOne({ where: { incompleteMatch: { id: match.id } } });
    if (reservation) {
      if (match.currentPlayers === match.maxPlayers) {
        match.status = MatchStatus.COMPLETED;
        reservation.reservedStatus = ReservationStatus.PENDING;
        reservation.statusComment = 'Pending, awaiting owner approval';
      } else {
        match.status = MatchStatus.PENDING;
        reservation.reservedStatus = ReservationStatus.WAITING;
        reservation.statusComment = 'Waiting for more players';
      }
      await this.reservationRepo.save(reservation);
    }

    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);

    if (match.currentPlayers < match.maxPlayers && match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Player Left Match',
        message: `A player has left your match (${match.title}). The match is no longer full and is now PENDING with ${match.currentPlayers} players.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return this.mapToResponseDto(savedMatch);
  }

  async cancel(id: string, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    if (match.creator.id !== user.id) {
      throw new ForbiddenException('Only creator can cancel');
    }
    match.status = MatchStatus.CANCELLED;
    const reservation = await this.reservationRepo.findOne({ where: { incompleteMatch: { id: match.id } } });
    if (reservation) {
      reservation.reservedStatus = ReservationStatus.CANCELLED;
      await this.reservationRepo.save(reservation);
    }
    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);

    if (match.players && match.creator) {
      for (const player of match.players) {
        if (player.id !== match.creator.id) {
          await this.notificationsService.create({
            userId: player.id,
            title: 'Match Cancelled',
            message: `The match (${match.title}) on ${match.date} from ${match.startTime} to ${match.endTime} has been cancelled.`,
            type: 'match',
            relatedId: match.id,
          });
        }
      }
    }

    return this.mapToResponseDto(savedMatch);
  }

  async remove(id: string, user: User): Promise<void> {
    const match = await this.matchRepo.findOne({
      where: { id },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    if (match.creator.id !== user.id) {
      throw new ForbiddenException('Only creator can remove');
    }
    const reservation = await this.reservationRepo.findOne({ where: { incompleteMatch: { id: match.id } } });
    if (reservation) {
      await this.reservationRepo.remove(reservation);
    }
    await this.matchRepo.remove(match);
  }

  async update(id: string, dto: UpdateIncompleteMatchDto, user: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });
    if (!match) throw new NotFoundException('Match not found');

    if (match.creator.id !== user.id) {
      throw new ForbiddenException('Only creator can update');
    }

    const addedCurrentPlayers = dto.addedCurrentPlayers || 0;
    const removedCurrentPlayers = dto.removedCurrentPlayers || 0;

    if (addedCurrentPlayers < 0) {
      throw new BadRequestException('addedCurrentPlayers cannot be negative');
    }
    if (removedCurrentPlayers < 0) {
      throw new BadRequestException('removedCurrentPlayers cannot be negative');
    }
    if (removedCurrentPlayers > match.currentPlayers - 1) {
      throw new BadRequestException(`Cannot remove more than ${match.currentPlayers - 1} players`);
    }

    const newCurrentPlayers = match.currentPlayers + addedCurrentPlayers - removedCurrentPlayers;

    if (newCurrentPlayers < 2) {
      throw new BadRequestException('Total currentPlayers must be at least 2');
    }
    if (newCurrentPlayers > match.maxPlayers) {
      throw new BadRequestException('Total currentPlayers cannot exceed maxPlayers');
    }

    match.currentPlayers = newCurrentPlayers;
    if (dto.title) match.title = dto.title;
    if (dto.city) match.city = dto.city;
    if (dto.description !== undefined) match.description = dto.description || '';
    if (dto.minAge !== undefined) match.minAge = dto.minAge;
    if (dto.maxAge !== undefined) match.maxAge = dto.maxAge;
    if (dto.minSkillLevel !== undefined) match.minSkillLevel = dto.minSkillLevel;
    if (dto.maxSkillLevel !== undefined) match.maxSkillLevel = dto.maxSkillLevel;
    if (dto.requiresApproval !== undefined) match.requiresApproval = dto.requiresApproval;
    if (dto.isPublic !== undefined) match.isPublic = dto.isPublic;
    if (dto.contactPhone) match.contactPhone = dto.contactPhone;
    match.updatedAt = new Date();

    let reservation: Reservation | null = null;
    if (match.currentPlayers === match.maxPlayers) {
      match.status = MatchStatus.COMPLETED;
      reservation = await this.reservationRepo.findOne({ where: { incompleteMatch: { id: match.id } } });
      if (reservation) {
        reservation.reservedStatus = ReservationStatus.PENDING;
        reservation.statusComment = 'Pending, awaiting owner approval';
        await this.reservationRepo.save(reservation);
      }
    } else {
      match.status = MatchStatus.PENDING;
      reservation = await this.reservationRepo.findOne({ where: { incompleteMatch: { id: match.id } } });
      if (reservation) {
        reservation.reservedStatus = ReservationStatus.WAITING;
        reservation.statusComment = 'Waiting for more players';
        await this.reservationRepo.save(reservation);
      }
    }

    const savedMatch = await this.matchRepo.save(match);

    if (match.currentPlayers === match.maxPlayers && match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Match Completed',
        message: `Your match (${match.title}) is now completed with ${match.maxPlayers} players on ${match.date} from ${match.startTime} to ${match.endTime}. The reservation is pending owner approval.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return this.mapToResponseDto(savedMatch);
  }

  async removePlayerFromMatch(matchId: string, playerId: string, currentUser: User): Promise<IncompleteMatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['creator', 'players', 'pendingPlayers', 'invitedPlayers', 'field', 'reservations'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.creator.id !== currentUser.id) {
      throw new ForbiddenException('Only the match creator can remove players');
    }

    if (match.creator.id === playerId) {
      throw new BadRequestException('Cannot remove the match creator');
    }

    const playerIndex = match.players.findIndex(player => player.id === playerId);
    if (playerIndex === -1) {
      throw new BadRequestException('Player is not in this match');
    }

    const removedPlayer = match.players[playerIndex];

    match.players.splice(playerIndex, 1);
    match.currentPlayers--;

    const reservation = await this.reservationRepo.findOne({ 
      where: { incompleteMatch: { id: match.id } } 
    });

    if (match.currentPlayers === match.maxPlayers) {
      match.status = MatchStatus.COMPLETED;
      if (reservation) {
        reservation.reservedStatus = ReservationStatus.PENDING;
        reservation.statusComment = 'Pending, awaiting owner approval';
        await this.reservationRepo.save(reservation);
      }
    } else {
      match.status = MatchStatus.PENDING;
      if (reservation) {
        reservation.reservedStatus = ReservationStatus.WAITING;
        reservation.statusComment = 'Waiting for more players';
        await this.reservationRepo.save(reservation);
      }
    }

    match.updatedAt = new Date();
    const savedMatch = await this.matchRepo.save(match);

    await this.notificationsService.create({
      userId: removedPlayer.id,
      title: 'Removed from Match',
      message: `You have been removed from the match "${match.title}" on ${match.date} from ${match.startTime} to ${match.endTime}.`,
      type: 'match',
      relatedId: match.id,
    });

    if (match.currentPlayers < match.maxPlayers && match.creator) {
      await this.notificationsService.create({
        userId: match.creator.id,
        title: 'Player Removed',
        message: `Player has been removed from your match "${match.title}". The match now has ${match.currentPlayers}/${match.maxPlayers} players.`,
        type: 'match',
        relatedId: match.id,
      });
    }

    return this.mapToResponseDto(savedMatch);
  }
}