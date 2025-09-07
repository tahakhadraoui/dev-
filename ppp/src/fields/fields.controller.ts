import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { FilterFieldsDto } from './dto/filter-fields.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiBearerAuth, ApiTags, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Field } from './entities/field.entity';

class TerrainResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class FieldCreateResponse {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  pricePerHour: number;
  matchDuration: number;
  hasShowers: boolean;
  hasWater: boolean;
  isIndoor: boolean;
  image: string;
  numberOfTerrains: number;
  createdAt: Date;
  updatedAt: Date;
  openingTime: string;
  closingTime: string;
  ownerId: string;
  terrains: TerrainResponse[];
}

@ApiTags('fields')
@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  @ApiResponse({ status: 201, description: 'Field created successfully', type: FieldCreateResponse })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateFieldDto })
  create(@Body() createFieldDto: CreateFieldDto, @GetUser() user: User) {
    return this.fieldsService.create(createFieldDto, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiResponse({ status: 200, description: 'List of filtered fields', type: [Field] })
  @ApiQuery({ name: 'city', required: false, type: String, example: 'Tunis' })
  @ApiQuery({ name: 'maxPricePerHour', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'hasShowers', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'hasWater', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'isIndoor', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2025-05-20' })
  @ApiQuery({ name: 'startTime', required: false, type: String, example: '17:00' })
  @ApiQuery({ name: 'endTime', required: false, type: String, example: '18:15' })
  findAll(@Query() filterDto: FilterFieldsDto) {
    if (filterDto.date && (filterDto.startTime || filterDto.endTime)) {
      if (!filterDto.startTime || !filterDto.endTime) {
        throw new BadRequestException('Both startTime and endTime are required if date is provided');
      }
      if (!/^\d{2}:\d{2}$/.test(filterDto.startTime) || !/^\d{2}:\d{2}$/.test(filterDto.endTime)) {
        throw new BadRequestException('startTime and endTime must be in HH:mm format');
      }
    }
    return this.fieldsService.findAllWithFilters(filterDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiResponse({ status: 200, description: 'Field details', type: Field })
  @ApiResponse({ status: 404, description: 'Field not found' })
  findOne(@Param('id') id: string) {
    return this.fieldsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  @ApiResponse({ status: 200, description: 'Field updated successfully', type: Field })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  update(@Param('id') id: string, @Body() updateFieldDto: UpdateFieldDto, @GetUser() user: User) {
    return this.fieldsService.update(id, updateFieldDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Field deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.fieldsService.remove(id, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('owner/fields')
  @ApiResponse({ status: 200, description: 'List of owner’s fields', type: [Field] })
  findOwnerFields(@GetUser() user: User) {
    return this.fieldsService.findOwnerFields(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':fieldId/available-time-slots')
  @ApiResponse({
    status: 200,
    description: 'Available and pending time slots',
    type: Object,
    example: {
      availableSlots: [{ startTime: '08:00', endTime: '09:15' }],
      pendingSlots: [{ startTime: '10:00', endTime: '11:15', comment: 'This time slot is pending and waiting for owner approval.' }],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'Date in YYYY-MM-DD format' })
  getAvailableTimeSlots(@Param('fieldId') fieldId: string, @Query('date') date: string) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date query parameter is required in YYYY-MM-DD format');
    }
    return this.fieldsService.getAvailableTimeSlotsWithPending(fieldId, date);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':fieldId/calculate-price')
  @ApiResponse({ status: 200, description: 'Calculated price', type: Number })
  @ApiResponse({ status: 400, description: 'Invalid duration' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  @ApiQuery({ name: 'duration', required: true, type: Number, description: 'Duration in minutes (75–120)' })
  async calculatePrice(@Param('fieldId') fieldId: string, @Query('duration') duration: string) {
    const matchDurationMinutes = parseInt(duration, 10);
    if (isNaN(matchDurationMinutes) || matchDurationMinutes < 75 || matchDurationMinutes > 120) {
      throw new BadRequestException('Duration must be a number between 75 and 120 minutes');
    }
    return this.fieldsService.calculatePriceForField(fieldId, matchDurationMinutes);
  }
}