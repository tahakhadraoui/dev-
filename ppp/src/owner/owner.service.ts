import { Injectable } from "@nestjs/common";
import { FieldsService } from "../fields/fields.service";
import { ReservationsService } from "../reservations/reservations.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, MoreThanOrEqual } from "typeorm";
import { Field } from "../fields/entities/field.entity";
import { Reservation } from "../reservations/entities/reservation.entity";
import { ReservationStatus } from "../common/enums/reservation-status.enum";

@Injectable()
export class OwnerService {
  constructor(
    private fieldsService: FieldsService,
    private reservationsService: ReservationsService,
    @InjectRepository(Field)
    private fieldsRepository: Repository<Field>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
  ) {}

  private calculateReservationCost(reservation: Reservation, field: Field): number {
    const startMinutes = this.timeToMinutes(reservation.startTime);
    const endMinutes = this.timeToMinutes(reservation.endTime);
    const durationMinutes = endMinutes - startMinutes;
    const hours = durationMinutes / 60;
    const cost = field.pricePerHour * hours;
    return Number(cost.toFixed(2));
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid time format: ${time}`);
    }
    return hours * 60 + minutes;
  }

  async getDashboard(ownerId: string) {
    const fields = await this.fieldsService.findOwnerFields(ownerId);
    const fieldIds = fields.map((field) => field.id);

    // Get pending reservations
    const pendingReservations = await this.reservationsRepository.find({
      where: {
        field: { id: In(fieldIds) },
        reservedStatus: ReservationStatus.PENDING,
      },
    });

    // Get total revenue
    const approvedReservations = await this.reservationsRepository.find({
      where: {
        field: { id: In(fieldIds) },
        reservedStatus: ReservationStatus.APPROVED,
      },
      relations: ['field'],
    });

    const totalRevenue = approvedReservations.reduce((sum, reservation) => {
      if (!reservation.field) return sum;
      return sum + this.calculateReservationCost(reservation, reservation.field);
    }, 0);

    // Get reservations for the next 7 days
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingReservations = await this.reservationsRepository
      .createQueryBuilder("reservation")
      .leftJoinAndSelect("reservation.field", "field")
      .leftJoinAndSelect("reservation.match", "match")
      .leftJoinAndSelect("reservation.incompleteMatch", "incompleteMatch")
      .leftJoinAndSelect("reservation.teamVsTeamMatch", "teamVsTeamMatch")
      .leftJoinAndSelect("field.owner", "owner")
      .where("owner.id = :ownerId", { ownerId })
      .andWhere("reservation.reservedStatus = :status", { status: ReservationStatus.APPROVED })
      .andWhere("reservation.date >= :today", { today: today.toISOString().split("T")[0] })
      .andWhere("reservation.date <= :nextWeek", { nextWeek: nextWeek.toISOString().split("T")[0] })
      .getMany();

    return {
      totalFields: fields.length,
      pendingReservations: pendingReservations.length,
      totalRevenue,
      upcomingReservations,
    };
  }

  async getFields(ownerId: string) {
    return this.fieldsService.findOwnerFields(ownerId);
  }

  async getReservations(ownerId: string) {
    const fields = await this.fieldsService.findOwnerFields(ownerId);
    const fieldIds = fields.map((field) => field.id);

    return this.reservationsRepository.find({
      where: {
        field: { id: In(fieldIds) },
      },
      relations: ["match", "incompleteMatch", "teamVsTeamMatch", "field"],
    });
  }

  async getPendingReservations(ownerId: string) {
    const fields = await this.fieldsService.findOwnerFields(ownerId);
    const fieldIds = fields.map((field) => field.id);

    return this.reservationsRepository.find({
      where: {
        field: { id: In(fieldIds) },
        reservedStatus: ReservationStatus.PENDING,
      },
      relations: ["match", "incompleteMatch", "teamVsTeamMatch", "field"],
    });
  }

  async getStatistics(ownerId: string, days: number = 30) {
    const fields = await this.fieldsService.findOwnerFields(ownerId);
    const fieldIds = fields.map((field) => field.id);

    // Filter by date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total reservations
    const totalReservations = await this.reservationsRepository.count({
      where: {
        field: { id: In(fieldIds) },
        date: MoreThanOrEqual(startDate.toISOString().split("T")[0]),
      },
    });

    // Get approved reservations
    const approvedReservations = await this.reservationsRepository.count({
      where: {
        field: { id: In(fieldIds) },
        reservedStatus: ReservationStatus.APPROVED,
        date: MoreThanOrEqual(startDate.toISOString().split("T")[0]),
      },
    });

    // Get rejected reservations
    const rejectedReservations = await this.reservationsRepository.count({
      where: {
        field: { id: In(fieldIds) },
        reservedStatus: ReservationStatus.REJECTED,
        date: MoreThanOrEqual(startDate.toISOString().split("T")[0]),
      },
    });

    // Get total revenue
    const reservations = await this.reservationsRepository.find({
      where: {
        field: { id: In(fieldIds) },
        reservedStatus: ReservationStatus.APPROVED,
        date: MoreThanOrEqual(startDate.toISOString().split("T")[0]),
      },
      relations: ['field'],
    });

    const totalRevenue = reservations.reduce((sum, reservation) => {
      if (!reservation.field) return sum;
      return sum + this.calculateReservationCost(reservation, reservation.field);
    }, 0);

    // Get revenue per field
    const revenuePerField: { fieldId: string; fieldName: string; revenue: number }[] = [];

    for (const field of fields) {
      const fieldReservations = await this.reservationsRepository.find({
        where: {
          field: { id: field.id },
          reservedStatus: ReservationStatus.APPROVED,
          date: MoreThanOrEqual(startDate.toISOString().split("T")[0]),
        },
        relations: ['field'],
      });

      const fieldRevenue = fieldReservations.reduce((sum, reservation) => {
        if (!reservation.field) return sum;
        return sum + this.calculateReservationCost(reservation, reservation.field);
      }, 0);

      revenuePerField.push({
        fieldId: field.id,
        fieldName: field.name,
        revenue: fieldRevenue,
      });
    }

    // Get revenue per day
    const revenuePerDay = await this.reservationsRepository
      .createQueryBuilder("reservation")
      .leftJoinAndSelect("reservation.field", "field")
      .leftJoinAndSelect("field.owner", "owner")
      .where("owner.id = :ownerId", { ownerId })
      .andWhere("reservation.reservedStatus = :status", { status: ReservationStatus.APPROVED })
      .andWhere("reservation.date >= :startDate", { startDate: startDate.toISOString().split("T")[0] })
      .select("reservation.date as date")
      .addSelect("COUNT(reservation.id) as count")
      .addSelect("SUM(CAST(field.pricePerHour * (EXTRACT(EPOCH FROM (CAST(reservation.endTime AS TIME) - CAST(reservation.startTime AS TIME))) / 3600) AS NUMERIC)) as revenue")
      .groupBy("reservation.date")
      .orderBy("reservation.date", "ASC")
      .getRawMany();

    // Get reservations per month
    const reservationsPerMonth = await this.reservationsRepository
      .createQueryBuilder("reservation")
      .leftJoinAndSelect("reservation.field", "field")
      .leftJoinAndSelect("field.owner", "owner")
      .where("owner.id = :ownerId", { ownerId })
      .andWhere("reservation.reservedStatus = :status", { status: ReservationStatus.APPROVED })
      .andWhere("reservation.date >= :startDate", { startDate: startDate.toISOString().split("T")[0] })
      .select("EXTRACT(MONTH FROM reservation.date) as month")
      .addSelect("EXTRACT(YEAR FROM reservation.date) as year")
      .addSelect("COUNT(reservation.id) as count")
      .addSelect("SUM(CAST(field.pricePerHour * (EXTRACT(EPOCH FROM (CAST(reservation.endTime AS TIME) - CAST(reservation.startTime AS TIME))) / 3600) AS NUMERIC)) as revenue")
      .groupBy("month")
      .addGroupBy("year")
      .orderBy("year", "ASC")
      .addOrderBy("month", "ASC")
      .getRawMany();

    return {
      totalFields: fields.length,
      totalReservations,
      approvedReservations,
      rejectedReservations,
      totalRevenue,
      revenuePerField,
      revenuePerDay,
      reservationsPerMonth,
    };
  }

  async getCalendar(ownerId: string) {
    const fields = await this.fieldsService.findOwnerFields(ownerId);
    const fieldIds = fields.map((field) => field.id);

    const reservations = await this.reservationsRepository.find({
      where: {
        field: { id: In(fieldIds) },
        reservedStatus: In([ReservationStatus.APPROVED, ReservationStatus.CANCELLED]),
      },
      relations: ["match", "incompleteMatch", "teamVsTeamMatch", "field"],
    });

    // Format reservations for calendar view
    const calendarEvents = reservations.map((reservation) => {
      const match = reservation.match || reservation.incompleteMatch || reservation.teamVsTeamMatch;
      return {
        id: reservation.id,
        title: `${match?.title || 'Reservation'} at ${reservation.field?.name || 'Unknown'} (${reservation.reservedStatus})`,
        start: `${reservation.date}T${reservation.startTime}`,
        end: `${reservation.date}T${reservation.endTime}`,
        fieldId: reservation.field?.id || 'Unknown',
        fieldName: reservation.field?.name || 'Unknown',
        matchId: match?.id || 'N/A',
        matchTitle: match?.title || 'N/A',
        status: reservation.reservedStatus,
      };
    });

    return calendarEvents;
  }
}