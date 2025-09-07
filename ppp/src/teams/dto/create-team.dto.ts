import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsUUID, IsArray } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 6 })
  @IsInt()
  @IsNotEmpty()
  @Min(6)
  teamSize: number;

  @ApiProperty({ example: ['123e4567-e89b-12d3-a456-426614174001'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  playerIds: string[];
}