import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual, In } from "typeorm";
import { UsersService } from "../users/users.service";
import { ReservationsService } from "../reservations/reservations.service";
import { FieldsService } from "../fields/fields.service";
import { FullMatchService } from "../matches/full-match/full-match.service";
import { IncompleteMatchService } from "../matches/incomplete-match/incomplete-match.service";
import { TeamVsTeamMatchService } from "../matches/team-vs-team-match/team-vs-team-match.service";
import { UserRole } from "../common/enums/user-role.enum";
import { UpdateUserDto } from "../users/dto/update-user.dto";
import { User } from "../users/entities/user.entity";
import { FullMatch } from "../matches/full-match/full-match.entity";
import { IncompleteMatch } from "../matches/incomplete-match/incomplete-match.entity";
import { TeamVsTeamMatch } from "../matches/team-vs-team-match/team-vs-team-match.entity";
import { Reservation } from "../reservations/entities/reservation.entity";
import { Field } from "../fields/entities/field.entity";
import { ReservationStatus } from "../common/enums/reservation-status.enum";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private usersService: UsersService,
    private reservationsService: ReservationsService,
    private fieldsService: FieldsService,
    private fullMatchService: FullMatchService,
    private incompleteMatchService: IncompleteMatchService,
    private teamVsTeamMatchService: TeamVsTeamMatchService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(FullMatch)
    private fullMatchRepository: Repository<FullMatch>,
    @InjectRepository(IncompleteMatch)
    private incompleteMatchRepository: Repository<IncompleteMatch>,
    @InjectRepository(TeamVsTeamMatch)
    private teamVsTeamMatchRepository: Repository<TeamVsTeamMatch>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(Field)
    private fieldsRepository: Repository<Field>,
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

  async findAllUsers() {
    return this.usersService.findAll();
  }

  async findAllOwners() {
    return this.usersService.findAll(UserRole.OWNER);
  }

  async findAllPlayers() {
    return this.usersService.findAll(UserRole.PLAYER);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const currentUser = await this.usersRepository.findOne({ where: { id } });
    if (!currentUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  async activateUser(id: string) {
    const currentUser = await this.usersRepository.findOne({ where: { id } });
    if (!currentUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.usersService.update(id, { isActive: true }, currentUser);
  }

  async deactivateUser(id: string) {
    const currentUser = await this.usersRepository.findOne({ where: { id } });
    if (!currentUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.usersService.update(id, { isActive: false }, currentUser);
  }

  async findAllMatches() {
    const fullMatches = await this.fullMatchService.findAll();
    const incompleteMatches = await this.incompleteMatchService.findAll();
    const teamVsTeamMatches = await this.teamVsTeamMatchService.findAll();
    return [
      ...fullMatches.map((m) => ({ ...m, type: "FULL" })),
      ...incompleteMatches.map((m) => ({ ...m, type: "INCOMPLETE" })),
      ...teamVsTeamMatches.map((m) => ({ ...m, type: "TEAM_VS_TEAM" })),
    ];
  }

  async findAllReservations() {
    return this.reservationsService.findAll();
  }

  async findAllFields() {
    return this.fieldsService.findAll();
  }

  async getStatistics() {
    const totalUsers = await this.usersRepository.count();
    const totalPlayers = await this.usersRepository.count({ where: { role: UserRole.PLAYER } });
    const totalOwners = await this.usersRepository.count({ where: { role: UserRole.OWNER } });
    const totalFullMatches = await this.fullMatchRepository.count({ where: { isDeleted: false } });
    const totalIncompleteMatches = await this.incompleteMatchRepository.count();
    const totalTeamVsTeamMatches = await this.teamVsTeamMatchRepository.count();
    const totalMatches = totalFullMatches + totalIncompleteMatches + totalTeamVsTeamMatches;
    const totalFields = await this.fieldsRepository.count();
    const totalReservations = await this.reservationsRepository.count();
    const approvedReservations = await this.reservationsRepository.count({
      where: { reservedStatus: ReservationStatus.APPROVED },
    });

    // Get all fields
    const fields = await this.fieldsRepository.find();

    // Get total revenue
    const reservations = await this.reservationsRepository
      .createQueryBuilder("reservation")
      .leftJoinAndSelect("reservation.field", "field")
      .where("reservation.reservedStatus = :status", { status: ReservationStatus.APPROVED })
      .andWhere("field.id IS NOT NULL")
      .getMany();

    const totalRevenue = reservations.reduce((sum, reservation) => {
      if (!reservation.field) {
        this.logger.warn(`Reservation ${reservation.id} has no associated field, skipping revenue calculation`);
        return sum;
      }
      return sum + this.calculateReservationCost(reservation, reservation.field);
    }, 0);

    // Get revenue per field
    const revenuePerField: { fieldId: string; fieldName: string; revenue: number }[] = [];

    for (const field of fields) {
      const fieldReservations = await this.reservationsRepository.find({
        where: {
          field: { id: field.id },
          reservedStatus: ReservationStatus.APPROVED,
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
      .where("reservation.reservedStatus = :status", { status: ReservationStatus.APPROVED })
      .andWhere("field.id IS NOT NULL")
      .select("reservation.date as date")
      .addSelect("COUNT(reservation.id) as count")
      .addSelect("SUM(CAST(field.pricePerHour * (EXTRACT(EPOCH FROM (CAST(reservation.endTime AS TIME) - CAST(reservation.startTime AS TIME))) / 3600) AS NUMERIC)) as revenue")
      .groupBy("reservation.date")
      .orderBy("reservation.date", "ASC")
      .getRawMany();

    // Get active users count
    const activeUsers = await this.usersRepository.count({ where: { isActive: true } });

    // Get users registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await this.usersRepository.count({
      where: {
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    return {
      users: {
        total: totalUsers,
        players: totalPlayers,
        owners: totalOwners,
        active: activeUsers,
        newLast30Days: newUsers,
      },
      matches: {
        total: totalMatches,
      },
      fields: {
        total: totalFields,
      },
      reservations: {
        total: totalReservations,
        approved: approvedReservations,
        totalRevenue,
        revenuePerField,
        revenuePerDay,
      },
    };
  } }