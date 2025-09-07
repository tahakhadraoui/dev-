import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Terrain } from '../terrain.entity';

export class UpdateTerrainDto {
  @ApiProperty({ description: 'Name of the terrain', example: 'Terrain 1', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Whether the terrain is active', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResponseTerrainDto {
  @ApiProperty({ description: 'ID of the terrain', example: 'terrain-uuid' })
  id: string;

  @ApiProperty({ description: 'Name of the terrain', example: 'Terrain 1' })
  name: string;

  @ApiProperty({ description: 'Whether the terrain is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'ID of the field this terrain belongs to', example: 'field-uuid' })
  fieldId: string;

  @ApiProperty({ description: 'Creation date of the terrain', example: '2025-05-17T03:46:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date of the terrain', example: '2025-05-17T03:46:00Z' })
  updatedAt: Date;

  constructor(terrain: Terrain) {
    this.id = terrain.id;
    this.name = terrain.name;
    this.isActive = terrain.isActive;
    this.fieldId = terrain.field.id;
    this.createdAt = terrain.createdAt;
    this.updatedAt = terrain.updatedAt;
  }
}