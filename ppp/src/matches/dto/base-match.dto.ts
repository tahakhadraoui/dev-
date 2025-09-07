import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchStatus } from 'src/common/enums/match-status.enum';

export class BaseMatchDto {
  @ApiProperty({ example: 'Friendly Match' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Tunis' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'A friendly match at the local field', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: MatchStatus, example: MatchStatus.PENDING })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiProperty({ example: '+21655887799', required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: '2025-05-20T14:00:00Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '15:30' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  fieldId: string;
}