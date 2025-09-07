import { IsOptional, IsInt, IsNumber, IsBoolean, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIncompleteMatchDto {
  @ApiPropertyOptional({ example: 'Friendly Match Updated' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Tunis' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsInt()
  minAge?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  maxAge?: number;

  @ApiPropertyOptional({ example: 1.0 })
  @IsOptional()
  @IsNumber()
  minSkillLevel?: number;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  maxSkillLevel?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  addedCurrentPlayers?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  removedCurrentPlayers?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}