import { IsInt, IsUUID, IsArray, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseMatchDto } from '../../dto/base-match.dto';
import { MatchType } from 'src/common/enums/match-type.enum';

export class CreateTeamVsTeamMatchDto extends BaseMatchDto {
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

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  creatorId: string;

  @ApiProperty({ example: ['123e4567-e89b-12d3-a456-426614174001'] })
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds: string[];

  @ApiProperty({ example: ['123e4567-e89b-12d3-a456-426614174002'] })
  @IsArray()
  @IsUUID('4', { each: true })
  pendingTeamIds: string[];

  @ApiPropertyOptional({ enum: MatchType, example: MatchType.TEAM_VS_TEAM })
  @IsOptional()
  @IsEnum(MatchType)
  type?: MatchType;
}