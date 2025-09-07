import { IsOptional, IsInt, IsUUID, IsArray, IsNumber, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateBaseMatchDto } from '../../dto/update-base-match.dto';
import { MatchType } from 'src/common/enums/match-type.enum';

export class UpdateTeamVsTeamMatchDto extends UpdateBaseMatchDto {
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

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  teamSize?: number;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @ApiPropertyOptional({ example: ['123e4567-e89b-12d3-a456-426614174001'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds?: string[];

  @ApiPropertyOptional({ example: ['123e4567-e89b-12d3-a456-426614174002'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  pendingTeamIds?: string[];

  @ApiPropertyOptional({ enum: MatchType, example: MatchType.TEAM_VS_TEAM })
  @IsOptional()
  @IsEnum(MatchType)
  type?: MatchType;
}