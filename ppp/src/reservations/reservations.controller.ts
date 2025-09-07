import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import {
  ApproveReservationDto,
  CreateAbonnementDto,
  CreateOwnerReservationDto,
  CreateReservationDto,
  ResponseReservationDto,
  UpdateAbonnementDto,
  UpdateReservationDto,
} from './dto/ReservationDtos';

@ApiTags('reservations')
@Controller('reservations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLAYER)
  @ApiOperation({ summary: 'Create a new reservation (player)' })
  @ApiResponse({ status: 201, description: 'Reservation created', type: ResponseReservationDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @Request() req,
  ): Promise<ResponseReservationDto> {
    const reservation = await this.reservationsService.create(createReservationDto, req.user);
    return new ResponseReservationDto(reservation);
  }

  @Post('owner')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new owner reservation' })
  @ApiResponse({ status: 201, description: 'Owner reservation created', type: ResponseReservationDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createOwnerReservation(
    @Body() createOwnerReservationDto: CreateOwnerReservationDto,
    @Request() req,
  ): Promise<ResponseReservationDto> {
    const reservation = await this.reservationsService.createOwnerReservation(
      createOwnerReservationDto,
      req.user,
    );
    return new ResponseReservationDto(reservation);
  }

  @Post('abonnement')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new abonnement (weekly recurring reservation)' })
  @ApiResponse({
    status: 201,
    description: 'Abonnement reservations created',
    type: [ResponseReservationDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createAbonnement(
    @Body() createAbonnementDto: CreateAbonnementDto,
    @Request() req,
  ): Promise<ResponseReservationDto[]> {
    const reservations = await this.reservationsService.createAbonnement(createAbonnementDto, req.user);
    return reservations.map(reservation => new ResponseReservationDto(reservation));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update a reservation (owner only)' })
  @ApiResponse({ status: 200, description: 'Reservation updated', type: ResponseReservationDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @Request() req,
  ): Promise<ResponseReservationDto> {
    const reservation = await this.reservationsService.update(id, updateReservationDto, req.user);
    return new ResponseReservationDto(reservation);
  }

  @Patch('abonnement')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update abonnement reservations (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Abonnement reservations updated',
    type: [ResponseReservationDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'No abonnement reservations found' })
  async updateAbonnement(
    @Body() updateAbonnementDto: UpdateAbonnementDto,
    @Request() req,
  ): Promise<ResponseReservationDto[]> {
    const reservations = await this.reservationsService.updateAbonnement(updateAbonnementDto, req.user);
    return reservations.map(reservation => new ResponseReservationDto(reservation));
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Approve a pending reservation (owner only)' })
  @ApiResponse({ status: 200, description: 'Reservation approved', type: ResponseReservationDto })
  @ApiResponse({ status: 400, description: 'Invalid input or not pending' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async approve(
    @Param('id') id: string,
    @Body() approveReservationDto: ApproveReservationDto,
    @Request() req,
  ): Promise<ResponseReservationDto> {
    const reservation = await this.reservationsService.approve(id, approveReservationDto, req.user);
    return new ResponseReservationDto(reservation);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.PLAYER)
  @ApiOperation({ summary: 'Cancel a reservation (owner or match creator)' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled', type: ResponseReservationDto })
  @ApiResponse({ status: 400, description: 'Already cancelled or rejected' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async cancel(@Param('id') id: string, @Request() req): Promise<ResponseReservationDto> {
    const reservation = await this.reservationsService.cancel(id, req.user);
    return new ResponseReservationDto(reservation);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Delete a reservation (owner only)' })
  @ApiResponse({ status: 204, description: 'Reservation deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    await this.reservationsService.remove(id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.PLAYER)
  @ApiOperation({ summary: 'Get a reservation by ID' })
  @ApiResponse({ status: 200, description: 'Reservation details', type: ResponseReservationDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async findOne(@Param('id') id: string, @Request() req): Promise<ResponseReservationDto> {
    const reservation = await this.reservationsService.findOne(id);
    if (req.user.role === UserRole.PLAYER && reservation.user?.id !== req.user.id) {
      throw new ForbiddenException('You can only view your own reservations');
    }
    return new ResponseReservationDto(reservation);
  }

  @Get('field/:fieldId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get all reservations for a field (owner only)' })
  @ApiResponse({ status: 200, description: 'List of reservations', type: [ResponseReservationDto] })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async findAllByField(
    @Param('fieldId') fieldId: string,
    @Request() req,
  ): Promise<ResponseReservationDto[]> {
    const reservations = await this.reservationsService.findAllByField(fieldId, req.user);
    return reservations.map(reservation => new ResponseReservationDto(reservation));
  }

  @Get('pending/:fieldId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get pending reservations for a field (owner only)' })
  @ApiResponse({ status: 200, description: 'List of pending reservations', type: [ResponseReservationDto] })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async findPendingByField(
    @Param('fieldId') fieldId: string,
    @Request() req,
  ): Promise<ResponseReservationDto[]> {
    const reservations = await this.reservationsService.findPendingByField(fieldId, req.user);
    return reservations.map(reservation => new ResponseReservationDto(reservation));
  }
}