import {
  Controller,
  Put,
  Delete,
  Get,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { TerrainsService } from './terrain.service';
import { ResponseTerrainDto, UpdateTerrainDto } from './dto/TerrainDtos';

@ApiTags('Terrains')
@Controller('terrains')
@ApiBearerAuth()
export class TerrainController {
  constructor(private readonly terrainsService: TerrainsService) {}

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiResponse({ status: HttpStatus.OK, description: 'Terrain updated successfully', type: ResponseTerrainDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'User is not the field owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Terrain not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTerrainDto: UpdateTerrainDto,
    @Request() req,
  ): Promise<ResponseTerrainDto> {
    const user = req.user;

    const isOwner = await this.terrainsService.isFieldOwnerForTerrain(id, user.id);
    if (!isOwner) {
      throw new UnauthorizedException('You are not the owner of the field');
    }

    const terrain = await this.terrainsService.update(id, updateTerrainDto, user.id);
    return new ResponseTerrainDto(terrain);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiResponse({ status: HttpStatus.OK, description: 'Terrain deleted successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Terrain has approved reservations' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'User is not the field owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Terrain not found' })
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    const user = req.user;

    const isOwner = await this.terrainsService.isFieldOwnerForTerrain(id, user.id);
    if (!isOwner) {
      throw new UnauthorizedException('You are not the owner of the field');
    }

    await this.terrainsService.delete(id, user.id);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Terrain details', type: ResponseTerrainDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Terrain not found' })
  async findOne(@Param('id') id: string): Promise<ResponseTerrainDto> {
    const terrain = await this.terrainsService.findOne(id);
    return new ResponseTerrainDto(terrain);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiResponse({ status: HttpStatus.OK, description: 'List of terrains for a field', type: [ResponseTerrainDto] })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'fieldId is required' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'User is not the field owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Field not found' })
  @ApiQuery({ name: 'fieldId', required: true, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAllByField(
    @Query('fieldId') fieldId: string,
    @Query('includeInactive') includeInactive: string,
    @Request() req,
  ): Promise<ResponseTerrainDto[]> {
    if (!fieldId) {
      throw new BadRequestException('fieldId is required');
    }

    const user = req.user;
    const terrains = await this.terrainsService.findAllByField(fieldId, includeInactive === 'true');
    if (terrains.length > 0) {
      const isOwner = await this.terrainsService.isFieldOwnerForTerrain(terrains[0].id, user.id);
      if (!isOwner) {
        throw new UnauthorizedException('You are not the owner of the field');
      }
    }

    return terrains.map((terrain) => new ResponseTerrainDto(terrain));
  }
}