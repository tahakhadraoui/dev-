import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Field } from 'src/fields/entities/field.entity';
import { Terrain } from 'src/terrain/terrain.entity';
import { FullMatch } from 'src/matches/full-match/full-match.entity';
import { IncompleteMatch } from 'src/matches/incomplete-match/incomplete-match.entity';
import { TeamVsTeamMatch } from 'src/matches/team-vs-team-match/team-vs-team-match.entity';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';
import { FieldsService } from 'src/fields/fields.service';
import { TerrainsService } from 'src/terrain/terrain.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import {
  ApproveReservationDto,
  CreateAbonnementDto,
  CreateOwnerReservationDto,
  CreateReservationDto,
  UpdateAbonnementDto,
  UpdateReservationDto,
} from './dto/ReservationDtos';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
    @InjectRepository(Terrain)
    private readonly terrainRepository: Repository<Terrain>,
    @InjectRepository(FullMatch)
    private readonly matchRepository: Repository<FullMatch>,
    @InjectRepository(IncompleteMatch)
    private readonly incompleteMatchRepository: Repository<IncompleteMatch>,
    @InjectRepository(TeamVsTeamMatch)
    private readonly teamVsTeamMatchRepository: Repository<TeamVsTeamMatch>,
    private readonly terrainsService: TerrainsService,
    private readonly fieldsService: FieldsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private timeToMinutes(time: string): number {
    console.log(`ReservationsService.timeToMinutes input: ${time}`);
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      throw new BadRequestException(`Invalid time format: ${time}. Expected HH:mm or HH:mm:ss`);
    }
    const [hours, minutes] = time.split(':').slice(0, 2).map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new BadRequestException(`Invalid time values: ${time}`);
    }
    return hours * 60 + minutes;
  }

  async create(createReservationDto: CreateReservationDto, user: any): Promise<Reservation> {
    console.log(`create input: ${JSON.stringify(createReservationDto)}`);
    const field = await this.fieldRepository.findOne({ where: { id: createReservationDto.fieldId }, relations: ['owner'] });
    if (!field) throw new NotFoundException(`Field with ID ${createReservationDto.fieldId} not found`);

    const startMinutes = this.timeToMinutes(createReservationDto.startTime);
    const endMinutes = this.timeToMinutes(createReservationDto.endTime);

    // Validate reservation time using FieldsService
    const isValidTime = await this.fieldsService.validateReservationTime(
      createReservationDto.fieldId,
      createReservationDto.date,
      createReservationDto.startTime,
      createReservationDto.endTime,
    );
    if (!isValidTime) {
      throw new BadRequestException('Reservation time is outside field operating hours or not available');
    }

    const duration = endMinutes <= startMinutes
      ? endMinutes + 24 * 60 - startMinutes
      : endMinutes - startMinutes;

    if (duration < 75 || duration > 90) {
      throw new BadRequestException('Reservation duration must be between 75 and 90 minutes');
    }

    let match: FullMatch | null = null;
    if (createReservationDto.matchId) {
      const foundMatch = await this.matchRepository.findOne({ where: { id: createReservationDto.matchId } });
      if (!foundMatch) throw new NotFoundException(`Match with ID ${createReservationDto.matchId} not found`);
      match = foundMatch;
    }

    const reservation = this.reservationRepository.create({
      date: createReservationDto.date,
      startTime: createReservationDto.startTime,
      endTime: createReservationDto.endTime,
      reservedStatus: createReservationDto.reservedStatus || ReservationStatus.PENDING,
      statusComment: createReservationDto.statusComment,
      phoneNumber: createReservationDto.phoneNumber,
      field,
      match: match ?? undefined,
      user,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedReservation = await this.reservationRepository.save(reservation);

    if (savedReservation.reservedStatus === ReservationStatus.PENDING) {
      const creatorIdentifier = user.username || user.id;
      const matchInfo = match ? `for match ${match.id}` : 'without a match';
      await this.notificationsService.create({
        userId: field.owner.id,
        title: 'New Pending Reservation',
        message: `A new pending reservation  was created by ${match?.creator.firstName} (phone: ${reservation.phoneNumber || 'Unknown'}) on ${reservation.date} from ${reservation.startTime} to ${reservation.endTime}.`,
        type: 'reservation',
        relatedId: savedReservation.id,
      });
    }

    return savedReservation;
  }

  async createOwnerReservation(dto: CreateOwnerReservationDto, owner: any): Promise<Reservation> {
    console.log(`createOwnerReservation input: ${JSON.stringify(dto)}`);
    const field = await this.fieldRepository.findOne({ where: { id: dto.fieldId }, relations: ['owner'] });
    if (!field) throw new NotFoundException(`Field with ID ${dto.fieldId} not found`);
    if (field.owner.id !== owner.id) throw new ForbiddenException('You are not the owner of this field');

    const terrain = await this.terrainRepository.findOne({ 
      where: { id: dto.terrainId },
      relations: ['field'],
    });
    if (!terrain || terrain.field.id !== dto.fieldId) {
      throw new NotFoundException(`Terrain with ID ${dto.terrainId} not found or not in this field`);
    }

    const startMinutes = this.timeToMinutes(dto.startTime);
    const endMinutes = this.timeToMinutes(dto.endTime);

    // Validate reservation time using FieldsService
    const isValidTime = await this.fieldsService.validateReservationTime(
      dto.fieldId,
      dto.date,
      dto.startTime,
      dto.endTime,
    );
    if (!isValidTime) {
      throw new BadRequestException('Reservation time is outside field operating hours or not available');
    }


    const duration = endMinutes <= startMinutes
      ? endMinutes + 24 * 60 - startMinutes
      : endMinutes - startMinutes;
    if (duration < 75 || duration > 90) {
      throw new BadRequestException('Reservation duration must be between 75 and 90 minutes');
    }

    // Keep existing availability check for consistency
    const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(dto.fieldId, dto.date);
    const isSlotAvailable = availableSlots.some(
      slot => slot.startTime === dto.startTime && slot.endTime === dto.endTime,
    );
    if (!isSlotAvailable) {
      throw new BadRequestException('Selected time slot is not available');
    }

    const isTerrainAvailable = await this.terrainsService.isTerrainAvailable(
      dto.terrainId,
      dto.date,
      dto.startTime,
      dto.endTime,
    );
    if (!isTerrainAvailable) {
      throw new BadRequestException('Selected terrain is not available for this time slot');
    }

    const reservation = this.reservationRepository.create({
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      phoneNumber: dto.phoneNumber,
      reservedStatus: ReservationStatus.APPROVED,
      statusComment: dto.statusComment || 'Owner-created reservation',
      field,
      terrain,
      user: owner,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.reservationRepository.save(reservation);
  }

  async createAbonnement(dto: CreateAbonnementDto, owner: any): Promise<Reservation[]> {
    console.log(`createAbonnement input: ${JSON.stringify(dto)}`);
    const field = await this.fieldRepository.findOne({ where: { id: dto.fieldId }, relations: ['owner'] });
    if (!field) throw new NotFoundException(`Field with ID ${dto.fieldId} not found`);
    if (field.owner.id !== owner.id) throw new ForbiddenException('You are not the owner of this field');

    const terrain = await this.terrainRepository.findOne({ 
      where: { id: dto.terrainId },
      relations: ['field'],
    });
    if (!terrain || terrain.field.id !== dto.fieldId) {
      throw new NotFoundException(`Terrain with ID ${dto.terrainId} not found or not in this field`);
    }

    const startMinutes = this.timeToMinutes(dto.startTime);
    const endMinutes = this.timeToMinutes(dto.endTime);

    // Validate reservation time using FieldsService
    const isValidTime = await this.fieldsService.validateReservationTime(
      dto.fieldId,
      dto.startDate,
      dto.startTime,
      dto.endTime,
    );
    if (!isValidTime) {
      throw new BadRequestException('Reservation time is outside field operating hours or not available');
    }

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('End time must be after start time');
    }
    const duration = endMinutes <= startMinutes
      ? endMinutes + 24 * 60 - startMinutes
      : endMinutes - startMinutes;
    if (duration < 75 || duration > 90) {
      throw new BadRequestException('Reservation duration must be between 75 and 90 minutes');
    }

    const reservations: Reservation[] = [];
    const startDate = new Date(dto.startDate);

    for (let i = 0; i < dto.weeks; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i * 7);
      const dateString = currentDate.toISOString().split('T')[0];

      // Keep existing availability check
      const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(dto.fieldId, dateString);
      const isSlotAvailable = availableSlots.some(
        slot => slot.startTime === dto.startTime && slot.endTime === dto.endTime,
      );
      if (!isSlotAvailable) {
        throw new BadRequestException(`Time slot not available on ${dateString}`);
      }

      const isTerrainAvailable = await this.terrainsService.isTerrainAvailable(
        dto.terrainId,
        dateString,
        dto.startTime,
        dto.endTime,
      );
      if (!isTerrainAvailable) {
        throw new BadRequestException(`Terrain not available on ${dateString}`);
      }

      const reservation = this.reservationRepository.create({
        date: dateString,
        startTime: dto.startTime,
        endTime: dto.endTime,
        phoneNumber: dto.phoneNumber,
        reservedStatus: ReservationStatus.APPROVED,
        statusComment: dto.statusComment || `Abonnement reservation for week ${i + 1}`,
        field,
        terrain,
        user: owner,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      reservations.push(reservation);
    }

    return this.reservationRepository.save(reservations);
  }

  async update(id: string, updateReservationDto: UpdateReservationDto, user: any): Promise<Reservation> {
    console.log(`update input: id=${id}, ${JSON.stringify(updateReservationDto)}`);
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['field', 'field.owner', 'terrain', 'match', 'incompleteMatch', 'teamVsTeamMatch', 'user', 'match.creator'],
    });
    if (!reservation) throw new NotFoundException(`Reservation with ID ${id} not found`);
    if (!reservation.field) throw new BadRequestException('Reservation has no associated field');
    const isFieldOwner = reservation.field.owner.id === user.id;
    const isMatchCreator = reservation.match?.creator?.id === user.id;

    if (!isFieldOwner && !isMatchCreator) {
      throw new ForbiddenException('Only the field owner or match creator can update this reservation');
    }

    if (updateReservationDto.fieldId) {
      const field = await this.fieldRepository.findOne({ where: { id: updateReservationDto.fieldId } });
      if (!field) throw new NotFoundException(`Field with ID ${updateReservationDto.fieldId} not found`);
      reservation.field = field;
    }

    if (updateReservationDto.terrainId) {
      const terrain = await this.terrainRepository.findOne({ 
        where: { id: updateReservationDto.terrainId },
        relations: ['field'],
      });
      if (!terrain || terrain.field.id !== (updateReservationDto.fieldId || reservation.field.id)) {
        throw new NotFoundException(`Terrain with ID ${updateReservationDto.terrainId} not found or not in this field`);
      }
      reservation.terrain = terrain;
    }

    if (updateReservationDto.date || updateReservationDto.startTime || updateReservationDto.endTime) {
      const date = updateReservationDto.date || reservation.date;
      const startTime = updateReservationDto.startTime || reservation.startTime;
      const endTime = updateReservationDto.endTime || reservation.endTime;

      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);

      // Validate reservation time using FieldsService
      const isValidTime = await this.fieldsService.validateReservationTime(
        updateReservationDto.fieldId || reservation.field.id,
        date,
        startTime,
        endTime,
      );
      if (!isValidTime) {
        throw new BadRequestException('Reservation time is outside field operating hours or not available');
      }

      if (endMinutes <= startMinutes) {
        throw new BadRequestException('End time must be after start time');
      }
      const duration = endMinutes <= startMinutes
        ? endMinutes + 24 * 60 - startMinutes
        : endMinutes - startMinutes;
      if (duration < 75 || duration > 90) {
        throw new BadRequestException('Reservation duration must be between 75 and 90 minutes');
      }

      // Keep existing availability check
      const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(
        updateReservationDto.fieldId || reservation.field.id,
        date,
      );
      const isSlotAvailable = availableSlots.some(
        slot => slot.startTime === startTime && slot.endTime === endTime,
      );
      if (!isSlotAvailable) {
        throw new BadRequestException('Selected time slot is not available');
      }

      if (updateReservationDto.terrainId || reservation.terrain) {
        const terrainId = updateReservationDto.terrainId || reservation.terrain?.id;
        if (terrainId) {
          const isTerrainAvailable = await this.terrainsService.isTerrainAvailable(
            terrainId,
            date,
            startTime,
            endTime,
          );
          if (!isTerrainAvailable) {
            throw new BadRequestException('Selected terrain is not available for this time slot');
          }
        }
      }

      reservation.date = date;
      reservation.startTime = startTime;
      reservation.endTime = endTime;
    }

    reservation.reservedStatus = updateReservationDto.reservedStatus || reservation.reservedStatus;
    reservation.statusComment = updateReservationDto.statusComment || reservation.statusComment;
    reservation.phoneNumber = updateReservationDto.phoneNumber || reservation.phoneNumber;
    reservation.updatedAt = new Date();

    return this.reservationRepository.save(reservation);
  }

  async updateAbonnement(dto: UpdateAbonnementDto, owner: any): Promise<Reservation[]> {
    console.log(`updateAbonnement input: ${JSON.stringify(dto)}`);
    const field = await this.fieldRepository.findOne({ where: { id: dto.fieldId }, relations: ['owner'] });
    if (!field) throw new NotFoundException(`Field with ID ${dto.fieldId} not found`);
    if (field.owner.id !== owner.id) throw new ForbiddenException('You are not the owner of this field');

    const startDate = new Date(dto.startDate);
    const reservations = await this.reservationRepository.find({
      where: {
        field: { id: dto.fieldId },
        reservedStatus: ReservationStatus.APPROVED,
        startTime: dto.startTime || undefined,
        endTime: dto.endTime || undefined,
        phoneNumber: dto.phoneNumber || undefined,
      },
      relations: ['field', 'field.owner', 'terrain', 'user'],
    });

    const abonnementReservations = reservations.filter(res => {
      const resDate = new Date(res.date);
      const diffDays = (resDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays % 7 === 0 && diffDays >= 0;
    });

    if (abonnementReservations.length === 0) {
      throw new NotFoundException('No abonnement reservations found for the specified criteria');
    }

    const updatedReservations: Reservation[] = [];
    for (const reservation of abonnementReservations) {
      if (!reservation.field) throw new BadRequestException('Reservation has no associated field');
      if (dto.terrainId) {
        const terrain = await this.terrainRepository.findOne({ 
          where: { id: dto.terrainId },
          relations: ['field'],
        });
        if (!terrain || terrain.field.id !== dto.fieldId) {
          throw new NotFoundException(`Terrain with ID ${dto.terrainId} not found or not in this field`);
        }
        reservation.terrain = terrain;
      }

      if (dto.startTime || dto.endTime || dto.terrainId) {
        const startTime = dto.startTime || reservation.startTime;
        const endTime = dto.endTime || reservation.endTime;

        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);

        // Validate reservation time using FieldsService
        const isValidTime = await this.fieldsService.validateReservationTime(
          dto.fieldId,
          reservation.date,
          startTime,
          endTime,
        );
        if (!isValidTime) {
          throw new BadRequestException('Reservation time is outside field operating hours or not available');
        }

        if (endMinutes <= startMinutes) {
          throw new BadRequestException('End time must be after start time');
        }
        const duration = endMinutes <= startMinutes
          ? endMinutes + 24 * 60 - startMinutes
          : endMinutes - startMinutes;
        if (duration < 75 || duration > 90) {
          throw new BadRequestException('Reservation duration must be between 75 and 90 minutes');
        }

        // Keep existing availability check
        const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(dto.fieldId, reservation.date);
        const isSlotAvailable = availableSlots.some(
          slot => slot.startTime === startTime && slot.endTime === endTime,
        );
        if (!isSlotAvailable) {
          throw new BadRequestException(`Time slot not available on ${reservation.date}`);
        }

        const terrainId = dto.terrainId || reservation.terrain?.id;
        if (terrainId) {
          const isTerrainAvailable = await this.terrainsService.isTerrainAvailable(
            terrainId,
            reservation.date,
            startTime,
            endTime,
          );
          if (!isTerrainAvailable) {
            throw new BadRequestException(`Terrain not available on ${reservation.date}`);
          }
        }

        reservation.startTime = startTime;
        reservation.endTime = endTime;
      }

      reservation.statusComment = dto.statusComment || reservation.statusComment;
      reservation.phoneNumber = dto.phoneNumber || reservation.phoneNumber;
      reservation.updatedAt = new Date();

      updatedReservations.push(reservation);
    }

    return this.reservationRepository.save(updatedReservations);
  }

  async approve(id: string, approveReservationDto: ApproveReservationDto, owner: any): Promise<Reservation> {
    try {
      console.log(`approve input: id=${id}, ${JSON.stringify(approveReservationDto)}`);
      const reservation = await this.reservationRepository.findOne({
        where: { id },
        relations: ['field', 'field.owner', 'terrain', 'match', 'incompleteMatch', 'teamVsTeamMatch', 'user'],
      });
      console.log('Fetched reservation:', JSON.stringify(reservation, null, 2));
      if (!reservation) throw new NotFoundException(`Reservation with ID ${id} not found`);
      if (!reservation.field) throw new BadRequestException('Reservation has no associated field');
      if (!reservation.field.owner) throw new BadRequestException('Field has no associated owner');
      if (!reservation.user) throw new BadRequestException('Reservation has no associated user');
      if (reservation.field.owner.id !== owner.id) {
        throw new ForbiddenException('You are not the owner of this field');
      }

      if (reservation.reservedStatus !== ReservationStatus.PENDING) {
        throw new BadRequestException('Reservation is not in PENDING status');
      }

      const terrain = await this.terrainRepository.findOne({
        where: { id: approveReservationDto.terrainId },
        relations: ['field'],
      });
      if (!terrain || terrain.field.id !== reservation.field.id) {
        throw new NotFoundException(`Terrain with ID ${approveReservationDto.terrainId} not found or not in this field`);
      }

      const isAvailable = await this.terrainsService.isTerrainAvailable(
        terrain.id,
        reservation.date,
        reservation.startTime,
        reservation.endTime,
      );
      if (!isAvailable) {
        throw new BadRequestException('Selected terrain is not available for this time slot');
      }

      const overlappingReservations = await this.reservationRepository.find({
        where: {
          field: { id: reservation.field.id },
          date: reservation.date,
          reservedStatus: ReservationStatus.PENDING,
          id: Not(reservation.id),
        },
        relations: ['match', 'incompleteMatch', 'teamVsTeamMatch', 'user', 'field'],
      });

      const startMinutes = this.timeToMinutes(reservation.startTime);
      const endMinutes = this.timeToMinutes(reservation.endTime);
      const conflictingReservations = overlappingReservations.filter(overlap => {
        const overlapStart = this.timeToMinutes(overlap.startTime);
        const overlapEnd = this.timeToMinutes(overlap.endTime);
        return startMinutes < overlapEnd && overlapStart < endMinutes;
      });

      reservation.terrain = terrain;
      reservation.reservedStatus = ReservationStatus.APPROVED;
      reservation.statusComment = approveReservationDto.statusComment || 'Reservation approved';
      reservation.updatedAt = new Date();

      const savedReservation = await this.reservationRepository.save(reservation);

      const match = reservation.match || reservation.incompleteMatch || reservation.teamVsTeamMatch;
      if (match && reservation.user && match.id) {
        try {
          await this.notificationsService.create({
            userId: reservation.user.id,
            title: 'Reservation Approved',
            message: `Your reservation  for match ${match.title} on field ${reservation.field.name} on ${reservation.date} from ${reservation.startTime} to ${reservation.endTime} has been approved by the owner.`,
            type: 'reservation',
            relatedId: savedReservation.id,
          });
        } catch (notificationError) {
          console.error(`Failed to send approval notification for reservation ${savedReservation.id}:`, notificationError);
        }
      } else {
        console.warn(`Skipping approval notification for reservation ${savedReservation.id}: No valid match or user found`);
      }

      for (const conflict of conflictingReservations) {
        const conflictMatch = conflict.match || conflict.incompleteMatch || conflict.teamVsTeamMatch;
        if (conflictMatch && conflict.user && conflict.field && conflictMatch.id) {
          try {
            await this.notificationsService.create({
              userId: conflict.user.id,
              title: 'Time Slot Conflict',
              message: `The time slot for your pending reservation for match ${conflictMatch.title} on field ${conflict.field.name} on ${conflict.date} from ${conflict.startTime} to ${conflict.endTime} has been approved for another match. Please choose a new time slot.`,
              type: 'reservation',
              relatedId: conflict.id,
            });
          } catch (notificationError) {
            console.error(`Failed to send conflict notification for reservation ${conflict.id}:`, notificationError);
          }
        } else {
          console.warn(`Skipping conflict notification for reservation ${conflict.id}: Missing match, user, or field`);
        }
      }

      return savedReservation;
    } catch (error) {
      console.error(`Error approving reservation ${id}:`, error);
      throw new BadRequestException(`Failed to approve reservation: ${error.message}`);
    }
  }

  async cancel(id: string, user: any): Promise<Reservation> {
    console.log(`cancel input: id=${id}`);
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['field', 'field.owner', 'match', 'match.creator', 'incompleteMatch', 'incompleteMatch.creator', 'teamVsTeamMatch', 'teamVsTeamMatch.creator', 'user'],
    });
    if (!reservation) throw new NotFoundException(`Reservation with ID ${id} not found`);
    if (!reservation.field) throw new BadRequestException('Reservation has no associated field');

    if (
      reservation.reservedStatus === ReservationStatus.CANCELLED ||
      reservation.reservedStatus === ReservationStatus.REJECTED
    ) {
      throw new BadRequestException('Reservation is already cancelled or rejected');
    }

    const isFieldOwner = reservation.field.owner.id === user.id;
    const isMatchCreator =
      reservation.match?.creator?.id === user.id ||
      reservation.incompleteMatch?.creator?.id === user.id ||
      reservation.teamVsTeamMatch?.creator?.id === user.id;
    if (!isFieldOwner && !isMatchCreator) {
      throw new ForbiddenException('Only the field owner or match creator can cancel this reservation');
    }

    const originalStatus = reservation.reservedStatus;

    reservation.reservedStatus = ReservationStatus.CANCELLED;
    reservation.statusComment = isFieldOwner ? 'Reservation cancelled by owner' : 'Reservation cancelled by match creator';
    reservation.updatedAt = new Date();

    const savedReservation = await this.reservationRepository.save(reservation);

    if (isMatchCreator && originalStatus === ReservationStatus.APPROVED) {
      const match = reservation.match || reservation.incompleteMatch || reservation.teamVsTeamMatch;
      if (match) {
        const creatorIdentifier = user.username || user.id;
        const phoneNumber = reservation.phoneNumber || match.contactPhone || 'Unknown';
        const matchId = match.id;
        await this.notificationsService.create({
          userId: reservation.field.owner.id,
          title: 'Reservation Cancelled by Match Creator',
          message: `The reservation for match  was canceled by creator with (phone: ${phoneNumber}) on ${reservation.date} from ${reservation.startTime} to ${reservation.endTime}.`,
          type: 'reservation',
          relatedId: savedReservation.id,
        });
      }
    }

    if (isFieldOwner && originalStatus === ReservationStatus.APPROVED && reservation.user) {
      const match = reservation.match || reservation.incompleteMatch || reservation.teamVsTeamMatch;
      if (match) {
        await this.notificationsService.create({
          userId: reservation.user.id,
          title: 'Reservation Cancelled by Owner',
          message: `Your reservation  for match ${match.title} on field ${reservation.field.name} on ${reservation.date} from ${reservation.startTime} to ${reservation.endTime} was cancelled by the owner.`,
          type: 'reservation',
          relatedId: savedReservation.id,
        });
      }
    }

    return savedReservation;
  }

  async remove(id: string): Promise<void> {
    console.log(`remove input: id=${id}`);
    const reservation = await this.reservationRepository.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException(`Reservation with ID ${id} not found`);
    await this.reservationRepository.remove(reservation);
  }

  async findOne(id: string): Promise<Reservation> {
    console.log(`findOne input: id=${id}`);
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['field', 'terrain', 'match', 'incompleteMatch', 'teamVsTeamMatch', 'user'],
    });
    if (!reservation) throw new NotFoundException(`Reservation with ID ${id} not found`);
    return reservation;
  }

  async findAllByField(fieldId: string, user: any): Promise<Reservation[]> {
    console.log(`findAllByField input: fieldId=${fieldId}`);
    const field = await this.fieldsService.findOne(fieldId);
    if (field.owner.id !== user.id) {
      throw new ForbiddenException('You are not the owner of this field');
    }

    return this.reservationRepository.find({
      where: { field: { id: fieldId } },
      relations: ['field', 'terrain', 'match', 'incompleteMatch', 'teamVsTeamMatch', 'user'],
    });
  }

  async findPendingByField(fieldId: string, user: any): Promise<Reservation[]> {
    console.log(`findPendingByField input: fieldId=${fieldId}`);
    const field = await this.fieldsService.findOne(fieldId);
    if (field.owner.id !== user.id) {
      throw new ForbiddenException('You are not the owner of this field');
    }

    return this.reservationRepository.find({
      where: { field: { id: fieldId }, reservedStatus: ReservationStatus.PENDING },
      relations: ['field', 'terrain', 'match', 'incompleteMatch', 'teamVsTeamMatch', 'user'],
    });
  }

  async findAll(): Promise<Reservation[]> {
    console.log(`findAll called`);
    return this.reservationRepository.find({
      relations: ['field', 'terrain', 'match', 'incompleteMatch', 'teamVsTeamMatch', 'user'],
    });
  }
}