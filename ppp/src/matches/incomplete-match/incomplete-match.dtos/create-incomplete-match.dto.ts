import { IsOptional, IsInt, IsNumber, IsBoolean, IsArray, IsUUID, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseMatchDto } from '../../dto/base-match.dto';

export class CreateIncompleteMatchDto extends BaseMatchDto {
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

  @ApiProperty({ example: 2 })
  @IsInt()
  currentPlayers: number;

  @ApiProperty({ example: 14 })
  @IsInt()
  maxPlayers: number;

@ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  creatorFullName?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  requiresApproval: boolean;


}