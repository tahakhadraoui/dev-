import { IsEnum, IsOptional, IsString, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MatchType } from '../../../common/enums/match-type.enum';
import { MatchStatus } from '../../../common/enums/match-status.enum';

export class FilterMatchesDto {
  @ApiPropertyOptional({ example: 'Tunis' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: MatchType, example: MatchType.INCOMPLETE })
  @IsOptional()
  @IsEnum(MatchType)
  type?: MatchType;

  @ApiPropertyOptional({ enum: MatchStatus, example: MatchStatus.PENDING })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiPropertyOptional({ example: '2025-05-20' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minSkillLevel?: number;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxSkillLevel?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teamSize?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAge?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAge?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  joinable?: boolean;
}