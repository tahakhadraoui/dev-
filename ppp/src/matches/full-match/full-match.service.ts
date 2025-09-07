import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { User } from "src/users/entities/user.entity"
import { MatchStatus } from "src/common/enums/match-status.enum"
import { MatchType } from "src/common/enums/match-type.enum"
import { Reservation } from "src/reservations/entities/reservation.entity"
import { FieldsService } from "src/fields/fields.service"
import { ReservationsService } from "src/reservations/reservations.service"
import { NotificationsService } from "src/notifications/notifications.service"
import { ReservationStatus } from "src/common/enums/reservation-status.enum"
import { FullMatch } from "./full-match.entity"
import { CreateFullMatchDto, ResponseFullMatchDto, type UpdateFullMatchDto } from "./full-match.dto/FullMatchDtos"
import { Field } from "src/fields/entities/field.entity"
import { UpdateTimeSlotDtos } from "./full-match.dto/update-time-slot.dto"

@Injectable()
export class FullMatchService {
  constructor(
    @InjectRepository(FullMatch)
    private readonly matchRepo: Repository<FullMatch>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly fieldsService: FieldsService,
    private readonly reservationsService: ReservationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number)
    if (isNaN(hours) || isNaN(minutes)) {
      throw new BadRequestException(`Invalid time format: ${time}`)
    }
    return hours * 60 + minutes
  }

  async create(dto: CreateFullMatchDto, user: User): Promise<FullMatch> {
    const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(dto.fieldId, dto.date)
    const isSlotAvailable = availableSlots.some(
      (slot) => slot.startTime === dto.startTime && slot.endTime === dto.endTime,
    )

    if (!isSlotAvailable) {
      throw new BadRequestException("Selected time slot is not available")
    }

    const startMinutes = this.timeToMinutes(dto.startTime)
    let endMinutes = this.timeToMinutes(dto.endTime)
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }

    const duration = endMinutes - startMinutes
  

    const field = await this.fieldsService.findOne(dto.fieldId)
    if (!field) throw new NotFoundException(`Field with ID ${dto.fieldId} not found`)

    const match = this.matchRepo.create({
      type: MatchType.FULL,
      title: dto.title,
      city: dto.city,
      description: dto.description,
      status: MatchStatus.COMPLETED,
      contactPhone: dto.contactPhone,
      date: new Date(dto.date),
      startTime: dto.startTime,
      endTime: dto.endTime,
      isPublic: dto.isPublic,
      isDeleted: false,
      creator: user,
      field,
    })

    const savedMatch = await this.matchRepo.save(match)

    const reservation = await this.reservationsService.create(
      {
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reservedStatus: ReservationStatus.PENDING,
        phoneNumber: dto.contactPhone,
        fieldId: dto.fieldId,
        matchId: savedMatch.id,
        statusComment: "Pending, awaiting owner approval",
      },
      user,
    )

    // Reload match with reservations relation
    const matchWithReservations = await this.matchRepo.findOne({
      where: { id: savedMatch.id },
      relations: ["creator", "field", "reservations"],
    })

    if (!matchWithReservations) throw new NotFoundException("Match not found after creation")

    return matchWithReservations
  }

  // NEW METHOD: Get matches by creator
  async findAllByCreator(creatorId: string): Promise<ResponseFullMatchDto[]> {
    console.log(`Finding matches for creator: ${creatorId}`)

    const matches = await this.matchRepo.find({
      where: {
        isDeleted: false,
        creator: { id: creatorId },
      },
      relations: ["creator", "field", "reservations"],
      order: { createdAt: "DESC" },
    })

    console.log(`Found ${matches.length} matches for creator ${creatorId}`)

    return matches.map((match) => new ResponseFullMatchDto(match))
  }

  // KEEP ORIGINAL METHOD for admin purposes
  async findAll(): Promise<ResponseFullMatchDto[]> {
    const matches = await this.matchRepo.find({
      where: { isDeleted: false },
      relations: ["creator", "field", "reservations"],
      order: { createdAt: "DESC" },
    })

    return matches.map((match) => new ResponseFullMatchDto(match))
  }

  // UPDATED: Add ownership check
  async findOne(id: string, userId?: string): Promise<ResponseFullMatchDto> {
    const match = await this.matchRepo.findOne({
      where: { id, isDeleted: false },
      relations: ["creator", "field", "reservations"],
    })

    if (!match) throw new NotFoundException("Match not found")

    // If userId is provided, check ownership
    if (userId && match.creator.id !== userId) {
      throw new ForbiddenException("You can only view your own matches")
    }

    return new ResponseFullMatchDto(match)
  }

  async update(id: string, dto: UpdateFullMatchDto, user: User): Promise<FullMatch> {
    const match = await this.matchRepo.findOne({
      where: { id, isDeleted: false },
      relations: ["creator", "field", "reservations"],
    })

    if (!match) throw new NotFoundException("Match not found")
    if (match.creator.id !== user.id) throw new ForbiddenException("Only creator can update")

    const reservation = match.reservations[0] // Assuming one reservation per match
    if (!reservation || reservation.reservedStatus !== ReservationStatus.PENDING) {
      throw new ForbiddenException("Match can only be updated while reservation is pending")
    }

    if (dto.fieldId) {
      const field = await this.fieldsService.findOne(dto.fieldId)
      if (!field) throw new NotFoundException(`Field with ID ${dto.fieldId} not found`)
      match.field = field
    }

    if (dto.date && dto.startTime && dto.endTime) {
      const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(match.field.id, dto.date)
      const isSlotAvailable = availableSlots.some(
        (slot) => slot.startTime === dto.startTime && slot.endTime === dto.endTime,
      )

      if (!isSlotAvailable) throw new BadRequestException("Selected time slot is not available")

      const startMinutes = this.timeToMinutes(dto.startTime)
      const endMinutes = this.timeToMinutes(dto.endTime)
      const duration = endMinutes - startMinutes

    
    }

    if (dto.title) match.title = dto.title
    if (dto.city) match.city = dto.city
    if (dto.description !== undefined) match.description = dto.description
    if (dto.status) match.status = dto.status
    if (dto.date) match.date = new Date(dto.date)
    if (dto.startTime) match.startTime = dto.startTime
    if (dto.endTime) match.endTime = dto.endTime
    if (dto.isPublic !== undefined) match.isPublic = dto.isPublic
    if (dto.contactPhone) match.contactPhone = dto.contactPhone

    match.updatedAt = new Date()

    if (reservation && (dto.date || dto.startTime || dto.endTime || dto.contactPhone)) {
      await this.reservationsService.update(
        reservation.id,
        {
          date: dto.date || reservation.date,
          startTime: dto.startTime || reservation.startTime,
          endTime: dto.endTime || reservation.endTime,
          phoneNumber: dto.contactPhone || reservation.phoneNumber,
          reservedStatus:
            match.status === MatchStatus.CANCELLED ? ReservationStatus.CANCELLED : ReservationStatus.PENDING,
          statusComment:
            match.status === MatchStatus.CANCELLED ? "Cancelled by creator" : "Pending, awaiting owner approval",
        },
        user,
      )
    }

    return this.matchRepo.save(match)
  }

  async updateTimeSlot(dto: UpdateTimeSlotDtos & { id: string }, user: User): Promise<FullMatch> {
  const match = await this.matchRepo.findOne({
    where: { id: dto.id, isDeleted: false },
    relations: ["creator", "field", "reservations"],
  });

  if (!match) throw new NotFoundException("Match not found");
  if (match.creator.id !== user.id) throw new ForbiddenException("Only creator can update time slot");

  const reservation = match.reservations[0]; // Assuming one reservation per match
  if (!reservation || reservation.reservedStatus !== ReservationStatus.PENDING) {
    throw new ForbiddenException("Time slot can only be updated while reservation is pending");
  }

  const field = await this.fieldsService.findOne(match.field.id);
  const { availableSlots } = await this.fieldsService.getAvailableTimeSlotsWithPending(field.id, dto.date);

  const isSlotAvailable = availableSlots.some((slot) => {
    const slotStart = this.timeToMinutes(slot.startTime);
    let slotEnd = this.timeToMinutes(slot.endTime);
    if (slotEnd <= slotStart) slotEnd += 24 * 60;

    const reqStart = this.timeToMinutes(dto.startTime);
    let reqEnd = this.timeToMinutes(dto.endTime);
    if (reqEnd <= reqStart) reqEnd += 24 * 60;

    return slotStart === reqStart && slotEnd === reqEnd;
  });

  if (!isSlotAvailable) {
    throw new BadRequestException("Selected time slot is not available");
  }

  const startMinutes = this.timeToMinutes(dto.startTime);
  const endMinutes = this.timeToMinutes(dto.endTime);
  const duration = endMinutes - startMinutes;



  await this.reservationsService.update(
    reservation.id,
    {
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      reservedStatus: ReservationStatus.PENDING,
      statusComment: "Pending, awaiting owner approval",
    },
    user,
  );

  match.date = new Date(dto.date);
  match.startTime = dto.startTime;
  match.endTime = dto.endTime;
  match.updatedAt = new Date();

  return this.matchRepo.save(match);
}
  async cancel(id: string, user: User): Promise<FullMatch> {
    const match = await this.matchRepo.findOne({
      where: { id, isDeleted: false },
      relations: ["creator", "reservations", "field"],
    })

    if (!match) throw new NotFoundException("Match not found")
    if (match.creator.id !== user.id) throw new ForbiddenException("Only creator can cancel")

    const reservation = match.reservations[0] // Assuming one reservation per match

    if (reservation && reservation.reservedStatus === ReservationStatus.APPROVED) {
      await this.reservationsService.update(
        reservation.id,
        {
          reservedStatus: ReservationStatus.CANCELLED,
          statusComment: "Cancelled by creator after approval",
        },
        user,
      )
    } else if (reservation) {
      await this.reservationsService.update(
        reservation.id,
        {
          reservedStatus: ReservationStatus.CANCELLED,
          statusComment: "Cancelled by creator",
        },
        user,
      )
    }

    match.status = MatchStatus.CANCELLED
    match.updatedAt = new Date()

    return this.matchRepo.save(match)
  }

  async remove(id: string, user: User): Promise<void> {
    const match = await this.matchRepo.findOne({
      where: { id, isDeleted: false },
      relations: ["creator", "reservations", "field"],
    })

    if (!match) throw new NotFoundException("Match not found")
    if (match.creator.id !== user.id) throw new ForbiddenException("Only creator can remove")

    const reservation = match.reservations[0] // Assuming one reservation per match

    if (reservation && reservation.reservedStatus === ReservationStatus.APPROVED) {
      throw new ForbiddenException("Match must be cancelled before deletion when reservation is approved")
    }

    if (match.status !== MatchStatus.CANCELLED) {
      throw new ForbiddenException("Match must be cancelled before deletion")
    }

    if (reservation) {
      await this.reservationRepo.remove(reservation)
    }

    match.isDeleted = true
    await this.matchRepo.save(match)
  }
}
