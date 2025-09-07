import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { FilterFieldsDto } from './dto/filter-fields.dto';
import { Field } from './entities/field.entity';
import { Terrain } from '../terrain/terrain.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { TimeSlot, PendingSlot } from './type';
import { plainToClass } from 'class-transformer';
import { FieldResponseDto } from './dto/field-response.dto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class FieldsService {
  constructor(
    @InjectRepository(Field)
    private readonly fieldsRepository: Repository<Field>,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    private readonly usersService: UsersService,
  ) {}

  async create(createFieldDto: CreateFieldDto, userId: string): Promise<FieldResponseDto> {
    const owner = await this.usersService.findOne(userId, {
      relations: ['joinedMatches', 'receivedRatings'],
    });

    if (!owner) {
      throw new NotFoundException('User not found');
    }

    if (owner.role !== UserRole.OWNER) {
      throw new BadRequestException('Only field owners can create fields');
    }

    if (createFieldDto.numberOfTerrains < 1) {
      throw new BadRequestException('Number of terrains must be at least 1');
    }

    if (
      createFieldDto.openingTime &&
      createFieldDto.closingTime &&
      !this.isValidTimeRange(createFieldDto.openingTime, createFieldDto.closingTime)
    ) {
      throw new BadRequestException('Invalid time range: opening time must be before closing time and properly formatted');
    }

    const field = this.fieldsRepository.create({
      ...createFieldDto,
      owner,
      numberOfTerrains: createFieldDto.numberOfTerrains,
    });

    const terrains: Terrain[] = [];
    for (let i = 1; i <= createFieldDto.numberOfTerrains; i++) {
      const terrain = new Terrain();
      terrain.name = `Terrain ${i}`;
      terrain.field = field;
      terrain.isActive = true;
      terrains.push(terrain);
    }
    field.terrains = terrains;

    const savedField = await this.fieldsRepository.save(field);
    savedField.terrains = await this.fieldsRepository
      .createQueryBuilder('field')
      .relation(Field, 'terrains')
      .of(savedField)
      .loadMany();

    return plainToClass(FieldResponseDto, savedField, { excludeExtraneousValues: true });
  }

  async findAll(): Promise<Field[]> {
    const fields = await this.fieldsRepository.find({
      select: [
        'id',
        'name',
        'description',
        'address',
        'city',
        'pricePerHour',
        'matchDuration',
        'hasShowers',
        'hasWater',
        'isIndoor',
        'image',
        'numberOfTerrains',
        'openingTime',
        'closingTime',
      ],
      relations: ['owner'],
    });

    return fields.map(field => ({
      ...field,
      openingTime: field.openingTime?.replace(/:00$/, ''),
      closingTime: field.closingTime?.replace(/:00$/, ''),
    }));
  }

  async findAllWithFilters(filterDto: FilterFieldsDto): Promise<Field[]> {
    const {
      city,
      maxPricePerHour,
      hasShowers,
      hasWater,
      isIndoor,
      date,
      startTime,
      endTime,
    } = filterDto;

    const query = this.fieldsRepository.createQueryBuilder('field')
      .select([
        'field.id',
        'field.name',
        'field.description',
        'field.address',
        'field.city',
        'field.pricePerHour',
        'field.matchDuration',
        'field.hasShowers',
        'field.hasWater',
        'field.isIndoor',
        'field.image',
        'field.numberOfTerrains',
        'field.openingTime',
        'field.closingTime',
        'owner.id',
        'owner.email',
      ])
      .leftJoin('field.owner', 'owner');

    if (city) {
      query.andWhere('field.city ILIKE :city', { city: `%${city}%` });
    }
    if (maxPricePerHour !== undefined) {
      query.andWhere('field.pricePerHour <= :maxPricePerHour', { maxPricePerHour });
    }
    if (hasShowers !== undefined) {
      query.andWhere('field.hasShowers = :hasShowers', { hasShowers });
    }
    if (hasWater !== undefined) {
      query.andWhere('field.hasWater = :hasWater', { hasWater });
    }
    if (isIndoor !== undefined) {
      query.andWhere('field.isIndoor = :isIndoor', { isIndoor });
    }

    const fields = await query.getMany();

    const normalizedFields = fields.map(field => ({
      ...field,
      openingTime: field.openingTime?.replace(/:00$/, ''),
      closingTime: field.closingTime?.replace(/:00$/, ''),
    }));

    if (date && startTime && endTime) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Date must be in YYYY-MM-DD format');
      }
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(startTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(endTime)) {
        throw new BadRequestException('startTime and endTime must be in HH:mm or HH:mm:ss format');
      }

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayString = nextDay.toISOString().split('T')[0];

      let startMinutes = this.timeToMinutes(startTime);
      let endMinutes = this.timeToMinutes(endTime);
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Handle overnight
      }
      const duration = endMinutes - startMinutes;
      if (duration < 75 || duration > 120) {
        throw new BadRequestException('Time slot must be between 75 and 120 minutes');
      }

      const filteredFields: Field[] = [];
      for (const field of normalizedFields) {
        if (!field.openingTime || !field.closingTime || !this.isValidTimeRange(field.openingTime, field.closingTime)) {
          continue;
        }

        let fieldOpening = this.timeToMinutes(field.openingTime);
        let fieldClosing = this.timeToMinutes(field.closingTime);
        if (fieldClosing <= fieldOpening) {
          fieldClosing += 24 * 60;
        }

        // Normalize requested time to the same day as field opening
        let normalizedStart = startMinutes;
        let normalizedEnd = endMinutes;
        if (startMinutes >= 24 * 60) {
          normalizedStart -= 24 * 60;
          normalizedEnd -= 24 * 60;
        }

        // Check if the requested time slot is within field hours
        if (normalizedStart < fieldOpening || normalizedEnd > fieldClosing) {
          continue;
        }

        const { availableSlots } = await this.getAvailableTimeSlotsWithPending(field.id, date);
        const isAvailable = availableSlots.some(slot => {
          let slotStart = this.timeToMinutes(slot.startTime);
          let slotEnd = this.timeToMinutes(slot.endTime);
          const slotDate = slot.date;

          if (slotDate === nextDayString) {
            slotStart += 24 * 60;
            slotEnd += 24 * 60;
          }

          // FIX: Handle overnight slots
          if (slotEnd <= slotStart) {
            slotEnd += 24 * 60;
          }

          let reqStart = startMinutes;
          let reqEnd = endMinutes;
          if (reqEnd <= reqStart) {
            reqEnd += 24 * 60;
          }

          return slotStart <= reqStart && slotEnd >= reqEnd;
        });

        if (isAvailable) {
          filteredFields.push(field);
        }
      }

      return filteredFields;
    }

    return normalizedFields;
  }

  async findOne(id: string): Promise<Field> {
    const field = await this.fieldsRepository.findOne({
      where: { id },
      relations: ['owner', 'terrains', 'reservations', 'fullMatches', 'incompleteMatches', 'teamVsTeamMatches'],
    });

    if (!field) {
      throw new NotFoundException(`Field with ID ${id} not found`);
    }

    field.openingTime = field.openingTime?.replace(/:00$/, '');
    field.closingTime = field.closingTime?.replace(/:00$/, '');

    return field;
  }

  async update(id: string, updateFieldDto: UpdateFieldDto, user: User): Promise<Field> {
    const field = await this.findOne(id);

    if (user.role !== UserRole.ADMIN && field.owner.id !== user.id) {
      throw new ForbiddenException('You do not have permission to update this field');
    }

    if (
      updateFieldDto.numberOfTerrains !== undefined &&
      updateFieldDto.numberOfTerrains < 1
    ) {
      throw new BadRequestException('Number of terrains must be at least 1');
    }

    if (
      updateFieldDto.openingTime &&
      updateFieldDto.closingTime &&
      !this.isValidTimeRange(updateFieldDto.openingTime, updateFieldDto.closingTime)
    ) {
      throw new BadRequestException('Invalid time range: opening time must be before closing time and properly formatted');
    }

    Object.assign(field, updateFieldDto);

    const savedField = await this.fieldsRepository.save(field);
    savedField.openingTime = savedField.openingTime?.replace(/:00$/, '');
    savedField.closingTime = savedField.closingTime?.replace(/:00$/, '');

    return savedField;
  }

  async remove(id: string, user: User): Promise<void> {
    const field = await this.findOne(id);

    if (user.role !== UserRole.ADMIN && field.owner.id !== user.id) {
      throw new ForbiddenException('You do not have permission to delete this field');
    }

    await this.fieldsRepository.remove(field);
  }

  async findOwnerFields(ownerId: string): Promise<Field[]> {
    const fields = await this.fieldsRepository.find({
      where: { owner: { id: ownerId } },
      relations: ['terrains', 'reservations', 'fullMatches', 'incompleteMatches', 'teamVsTeamMatches'],
    });

    return fields.map(field => ({
      ...field,
      openingTime: field.openingTime?.replace(/:00$/, ''),
      closingTime: field.closingTime?.replace(/:00$/, ''),
    }));
  }

  public timeToMinutes(time: string): number {
    console.log(`timeToMinutes input: ${time}`);
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      throw new BadRequestException(`Invalid time format: ${time}. Expected HH:mm or HH:mm:ss`);
    }
    const [hours, minutes] = time.split(':').slice(0, 2).map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new BadRequestException(`Invalid time values: ${time}`);
    }
    return hours * 60 + minutes;
  }

  public minutesToTime(minutes: number): string {
    const normalizedMinutes = minutes % (24 * 60); // Ensure minutes are within 24 hours
    const h = Math.floor(normalizedMinutes / 60).toString().padStart(2, '0');
    const m = (normalizedMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  public isValidTimeRange(openingTime: string, closingTime: string): boolean {
    try {
      const openingMinutes = this.timeToMinutes(openingTime);
      let closingMinutes = this.timeToMinutes(closingTime);
      if (closingMinutes === openingMinutes) {
        return false; // Opening and closing times cannot be identical
      }
      if (closingMinutes <= openingMinutes) {
        closingMinutes += 24 * 60;
      }
      return openingMinutes < closingMinutes;
    } catch {
      return false;
    }
  }

  async validateReservationTime(
    fieldId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    console.log(`validateReservationTime input: fieldId=${fieldId}, date=${date}, startTime=${startTime}, endTime=${endTime}`);
    const field = await this.fieldsRepository.findOne({ where: { id: fieldId } });
    if (!field || !field.openingTime || !field.closingTime) {
      throw new NotFoundException('Field not found or missing operating hours');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(startTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(endTime)) {
      throw new BadRequestException('startTime and endTime must be in HH:mm or HH:mm:ss format');
    }

    let startMinutes = this.timeToMinutes(startTime);
    let endMinutes = this.timeToMinutes(endTime);
    let fieldOpening = this.timeToMinutes(field.openingTime);
    let fieldClosing = this.timeToMinutes(field.closingTime);

    if (fieldClosing <= fieldOpening) {
      fieldClosing += 24 * 60; // Handle overnight fields
    }

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayString = nextDay.toISOString().split('T')[0];

    // Adjust for overnight slots
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    // For overnight fields, shift times after midnight
    if (fieldClosing > 24 * 60) { // overnight field
      if (startMinutes < fieldOpening) startMinutes += 24 * 60;
      if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    }

    // Validate duration
    const duration = endMinutes - startMinutes;
    if (duration < 75 || duration > 90) {
      throw new BadRequestException('Reservation duration must be between 75 and 90 minutes');
    }

    // Check if the slot is within field hours (overnight aware)
    let isWithinFieldHours = false;
    if (fieldClosing > fieldOpening) {
      // Normal case (not overnight)
      isWithinFieldHours = startMinutes >= fieldOpening && endMinutes <= fieldClosing;
    } else {
      // Overnight case (e.g., 19:00–03:00)
      // Shift times after midnight
      if (startMinutes < fieldOpening) startMinutes += 24 * 60;
      if (endMinutes <= startMinutes) endMinutes += 24 * 60;
      isWithinFieldHours = startMinutes >= fieldOpening && endMinutes <= fieldClosing + 24 * 60;
    }
    if (!isWithinFieldHours) {
      console.log(`Invalid reservation time: ${startTime}-${endTime} on ${date} (field hours: ${field.openingTime}-${field.closingTime})`);
      return false;
    }

    // Verify slot availability
    const { availableSlots } = await this.getAvailableTimeSlotsWithPending(fieldId, date);
    const isAvailable = availableSlots.some(slot => {
      let slotStart = this.timeToMinutes(slot.startTime);
      let slotEnd = this.timeToMinutes(slot.endTime);
      const slotDate = slot.date;

      if (slotDate === nextDayString) {
        slotStart += 24 * 60;
        slotEnd += 24 * 60;
      }

      // FIX: Handle overnight slots
      if (slotEnd <= slotStart) {
        slotEnd += 24 * 60;
      }

      let reqStart = startMinutes;
      let reqEnd = endMinutes;
      if (reqEnd <= reqStart) {
        reqEnd += 24 * 60;
      }

      return slotStart <= reqStart && slotEnd >= reqEnd;
    });

    if (!isAvailable) {
      console.log(`Slot ${startTime}-${endTime} on ${date} not available for field ${fieldId}`);
    }

    return isAvailable;
  }

  async getAvailableTimeSlotsWithPending(
    fieldId: string,
    date: string,
  ): Promise<{ availableSlots: TimeSlot[]; pendingSlots: PendingSlot[] }> {
    const field = await this.fieldsRepository.findOne({
      where: { id: fieldId },
      relations: ['terrains'],
    });
    if (!field) throw new NotFoundException('Field not found');
    if (!field.openingTime || !field.closingTime) {
      throw new BadRequestException('Field opening and closing times must be set');
    }
    if (field.numberOfTerrains < 1) {
      throw new BadRequestException('Field must have at least one terrain');
    }

    const openingTime = field.openingTime.replace(/:00$/, '');
    const closingTime = field.closingTime.replace(/:00$/, '');

    let opening = this.timeToMinutes(openingTime);
    let closing = this.timeToMinutes(closingTime);
    if (closing <= opening) {
      closing += 24 * 60; // Handle overnight operation
    }

    const minDuration = 75;
    const fixedDuration = 90;

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayString = nextDay.toISOString().split('T')[0];

    // Initialize timeline
    const timelineLength = closing - opening;
    const approvedTimeline = new Array(timelineLength).fill(0);
    const totalReservationTimeline = new Array(timelineLength).fill(0);

    // Fetch reservations
    const reservations = await this.reservationsRepository.find({
      where: [
        { field: { id: fieldId }, date },
        { field: { id: fieldId }, date: nextDayString },
      ],
      relations: ['terrain'],
    });

    console.log(`Field ${fieldId}: opening=${openingTime} (${opening} min), closing=${closingTime} (${closing} min), terrains=${field.numberOfTerrains}`);
    console.log('Reservations:', reservations);

    // Process reservations
    for (const reservation of reservations) {
      let start = this.timeToMinutes(reservation.startTime);
      let end = this.timeToMinutes(reservation.endTime);
      const reservationDate = reservation.date;

      // Normalize times for next-day reservations
      if (reservationDate === nextDayString) {
        start += 24 * 60;
        end += 24 * 60;
      }

      // For overnight fields, map after-midnight reservations onto the timeline
      if (closing > 24 * 60) {
        // If reservation is after midnight (start < opening), shift to next day
        if (start < opening) start += 24 * 60;
        if (end <= start) end += 24 * 60;
      }

      // Only include reservations that overlap with field hours
      if (end <= opening || start >= closing) {
        console.log(`Skipping reservation ${reservation.id}: ${reservation.startTime}-${reservation.endTime} on ${reservationDate} (outside field hours)`);
        continue;
      }

      // Clip reservation to field hours
      start = Math.max(start, opening);
      end = Math.min(end, closing);

      const timelineStart = Math.max(0, Math.floor(start - opening));
      const timelineEnd = Math.min(timelineLength, Math.ceil(end - opening));

      console.log(`Processing reservation ${reservation.id}: ${reservation.startTime}-${reservation.endTime} on ${reservationDate}, timeline: ${timelineStart}-${timelineEnd}`);

      for (let i = timelineStart; i < timelineEnd && i < timelineLength; i++) {
        totalReservationTimeline[i] += 1;
        if (reservation.reservedStatus === ReservationStatus.APPROVED) {
          approvedTimeline[i] += 1;
        }
      }
    }

    console.log('Approved Timeline:', approvedTimeline);
    console.log('Total Reservation Timeline:', totalReservationTimeline);

    const rawAvailableSlots: TimeSlot[] = [];
    let slotStart: number | null = null;

    // Generate available slots
    for (let i = 0; i < timelineLength; i++) {
      if (approvedTimeline[i] < field.numberOfTerrains) {
        if (slotStart === null) slotStart = i;
      } else {
        if (slotStart !== null) {
          const slotStartTime = opening + slotStart;
          const slotEndTime = opening + i;
          rawAvailableSlots.push({
            startTime: this.minutesToTime(slotStartTime),
            endTime: this.minutesToTime(slotEndTime),
            date: slotStartTime >= 24 * 60 ? nextDayString : date,
          });
          slotStart = null;
        }
      }
    }

    // Close any open slot
    if (slotStart !== null) {
      const slotStartTime = opening + slotStart;
      const slotEndTime = closing;
      rawAvailableSlots.push({
        startTime: this.minutesToTime(slotStartTime),
        endTime: this.minutesToTime(slotEndTime),
        date: slotStartTime >= 24 * 60 ? nextDayString : date,
      });
    }

    console.log('Raw Available Slots:', rawAvailableSlots);

    // Process pending slots
    const pendingSlots: PendingSlot[] = [];
    let pendingSlotStart: number | null = null;

    for (let i = 0; i < timelineLength; i++) {
      if (
        totalReservationTimeline[i] >= field.numberOfTerrains &&
        approvedTimeline[i] < totalReservationTimeline[i]
      ) {
        if (pendingSlotStart === null) pendingSlotStart = i;
      } else {
        if (pendingSlotStart !== null) {
          const slotStartTime = opening + pendingSlotStart;
          const slotEndTime = opening + i;
          pendingSlots.push({
            startTime: this.minutesToTime(slotStartTime),
            endTime: this.minutesToTime(slotEndTime),
            date: slotStartTime >= 24 * 60 ? nextDayString : date,
            comment: 'This time slot is pending and waiting for owner approval.',
          });
          pendingSlotStart = null;
        }
      }
    }

    if (
      pendingSlotStart !== null &&
      totalReservationTimeline[timelineLength - 1] >= field.numberOfTerrains &&
      approvedTimeline[timelineLength - 1] < totalReservationTimeline[timelineLength - 1]
    ) {
      const slotStartTime = opening + pendingSlotStart;
      const slotEndTime = closing;
      pendingSlots.push({
        startTime: this.minutesToTime(slotStartTime),
        endTime: this.minutesToTime(slotEndTime),
        date: slotStartTime >= 24 * 60 ? nextDayString : date,
        comment: 'This time slot is pending and waiting for owner approval.',
      });
    }

    // Generate fixed-duration available slots
    const availableSlots: TimeSlot[] = [];
    for (const slot of rawAvailableSlots) {
      let start = this.timeToMinutes(slot.startTime);
      let end = this.timeToMinutes(slot.endTime);

      // Adjust end time for overnight slots
      if (end <= start) {
        end += 24 * 60; // Handle midnight crossing
      }

      let duration = end - start;
      if (duration < minDuration) continue;

      // Generate 90-minute slots
      while (duration >= fixedDuration) {
        const slotStartTime = start;
        const slotEndTime = start + fixedDuration;
        const currentSlotDate = slotStartTime >= 24 * 60 ? nextDayString : date;

        availableSlots.push({
          startTime: this.minutesToTime(slotStartTime),
          endTime: this.minutesToTime(slotEndTime),
          date: currentSlotDate,
        });

        start += fixedDuration;
        duration -= fixedDuration;
      }
    }

    console.log('Final Available Slots:', availableSlots);
    console.log('Pending Slots:', pendingSlots);

    // Filter pending slots to remove those that are fully approved
    const filteredPendingSlots = pendingSlots.filter(slot => {
      let slotStart = this.timeToMinutes(slot.startTime);
      let slotEnd = this.timeToMinutes(slot.endTime);
      if (slot.date === nextDayString) {
        slotStart += 24 * 60;
        slotEnd += 24 * 60;
      }
      // Check if all timeline indices for this slot are fully approved
      for (let i = slotStart - opening; i < slotEnd - opening; i++) {
        if (approvedTimeline[i] < field.numberOfTerrains) {
          return true; // Still pending for at least one minute
        }
      }
      return false; // Fully approved, remove from pending
    });

    // Split pending slots into 90-minute chunks
    const splitPendingSlots: PendingSlot[] = [];
    for (const slot of pendingSlots) {
      let start = this.timeToMinutes(slot.startTime);
      let end = this.timeToMinutes(slot.endTime);

      // Adjust end time for overnight slots
      if (end <= start) {
        end += 24 * 60;
      }

      let duration = end - start;
      while (duration >= minDuration) {
        const chunkEnd = Math.min(start + fixedDuration, end);
        if (chunkEnd - start >= minDuration) {
          splitPendingSlots.push({
            startTime: this.minutesToTime(start),
            endTime: this.minutesToTime(chunkEnd),
            date: start >= 24 * 60 ? nextDayString : date,
            comment: slot.comment,
          });
        }
        start += fixedDuration;
        duration = end - start;
      }
    }

    return { availableSlots, pendingSlots: splitPendingSlots };
  }

  calculateMatchCost(pricePerHour: number, matchDurationMinutes: number): number {
    if (pricePerHour < 0 || matchDurationMinutes < 0) {
      throw new BadRequestException('Price per hour and match duration must be non-negative');
    }
    if (matchDurationMinutes < 75 || matchDurationMinutes > 90) {
      throw new BadRequestException('Match duration must be between 75 and 90 minutes');
    }
    const hours = matchDurationMinutes / 60;
    const cost = pricePerHour * hours;
    return Number(cost.toFixed(2));
  }

  async calculatePriceForField(fieldId: string, matchDurationMinutes: number): Promise<number> {
    const field = await this.fieldsRepository.findOne({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Field not found');
    }
    return this.calculateMatchCost(field.pricePerHour, matchDurationMinutes);
  }
}