import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Terrain } from './terrain.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { FieldsService } from '../fields/fields.service';
import { UpdateTerrainDto } from './dto/TerrainDtos';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class TerrainsService {
  constructor(
    @InjectRepository(Terrain)
    private readonly terrainRepository: Repository<Terrain>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly fieldsService: FieldsService,
  ) {}

  async findOne(id: string, allowInactive: boolean = false): Promise<Terrain> {
    const terrain = await this.terrainRepository.findOne({
      where: { id, ...(allowInactive ? {} : { isActive: true }) },
      relations: ['field'],
    });
    if (!terrain) {
      throw new NotFoundException(`Terrain with ID ${id} not found`);
    }
    if (!terrain.isActive && !allowInactive) {
      throw new BadRequestException(`Terrain with ID ${id} is inactive`);
    }
    return terrain;
  }

  async findAllByField(fieldId: string, includeInactive: boolean = false): Promise<Terrain[]> {
    const field = await this.fieldsService.findOne(fieldId);
    if (!field) throw new NotFoundException(`Field with ID ${fieldId} not found`);

    return this.terrainRepository.find({
      where: { field: { id: fieldId }, ...(includeInactive ? {} : { isActive: true }) },
      relations: ['field'],
    });
  }

  async update(id: string, updateTerrainDto: UpdateTerrainDto, userId: string): Promise<Terrain> {
    const terrain = await this.findOne(id, true); // Allow inactive terrains
    const field = await this.fieldsService.findOne(terrain.field.id);
    if (field.owner.id !== userId && field.owner.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this terrain');
    }

    Object.assign(terrain, {
      name: updateTerrainDto.name ?? terrain.name,
      isActive: updateTerrainDto.isActive ?? terrain.isActive,
      updatedAt: new Date(),
    });

    const savedTerrain = await this.terrainRepository.save(terrain);

    // Update field.numberOfTerrains
    const activeTerrains = await this.terrainRepository.count({
      where: { field: { id: field.id }, isActive: true },
    });
    await this.fieldsService.update(field.id, { numberOfTerrains: activeTerrains }, field.owner);

    return savedTerrain;
  }

  async delete(id: string, userId: string): Promise<void> {
    const terrain = await this.findOne(id, true); // Allow inactive terrains
    const field = await this.fieldsService.findOne(terrain.field.id);
    if (field.owner.id !== userId && field.owner.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this terrain');
    }

    // Check for APPROVED reservations
    const hasApprovedReservations = await this.reservationRepository.findOne({
      where: {
        terrain: { id },
        reservedStatus: ReservationStatus.APPROVED,
      },
    });
    if (hasApprovedReservations) {
      throw new BadRequestException('Cannot delete terrain with approved reservations');
    }

    await this.terrainRepository.remove(terrain);

    // Update field.numberOfTerrains
    const activeTerrains = await this.terrainRepository.count({
      where: { field: { id: field.id }, isActive: true },
    });
    await this.fieldsService.update(field.id, { numberOfTerrains: activeTerrains }, field.owner);
  }

  async isTerrainAvailable(terrainId: string, date: string, startTime: string, endTime: string): Promise<boolean> {
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new BadRequestException('startTime and endTime must be in HH:mm format');
    }

    const terrain = await this.findOne(terrainId);
    if (!terrain.isActive) {
      throw new BadRequestException('Terrain is inactive');
    }

    const reservations = await this.reservationRepository.find({
      where: {
        terrain: { id: terrainId },
        date,
        reservedStatus: ReservationStatus.APPROVED,
      },
    });

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    return !reservations.some((res) => {
      const resStartMinutes = this.timeToMinutes(res.startTime);
      const resEndMinutes = this.timeToMinutes(res.endTime);
      return resStartMinutes < endMinutes && resEndMinutes > startMinutes;
    });
  }

  async getAvailableTerrains(fieldId: string, date: string, startTime: string, endTime: string): Promise<Terrain[]> {
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new BadRequestException('startTime and endTime must be in HH:mm format');
    }

    const terrains = await this.terrainRepository.find({
      where: { field: { id: fieldId }, isActive: true },
      relations: ['field', 'reservations'],
    });

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    return terrains.filter((terrain) => {
      const reservations = terrain.reservations.filter(
        (res) => res.date === date && res.reservedStatus === ReservationStatus.APPROVED,
      );
      return !reservations.some((res) => {
        const resStartMinutes = this.timeToMinutes(res.startTime);
        const resEndMinutes = this.timeToMinutes(res.endTime);
        return resStartMinutes < endMinutes && resEndMinutes > startMinutes;
      });
    });
  }

  async isFieldOwnerForTerrain(terrainId: string, userId: string): Promise<boolean> {
    const terrain = await this.findOne(terrainId, true); // Allow inactive terrains
    const field = await this.fieldsService.findOne(terrain.field.id);
    return field.owner.id === userId;
  }

  private timeToMinutes(time: string): number {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      throw new BadRequestException(`Invalid time format: ${time}. Expected HH:mm`);
    }
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }
    return hours * 60 + minutes;
  }
}