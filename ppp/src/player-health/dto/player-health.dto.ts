import { IsNumber, IsString, IsIn, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlayerHealthDto {
  @ApiProperty({ description: 'Age of the player', example: 25 })
  @IsNumber()
  age: number;

  @ApiProperty({ description: 'Weight of the player in kg', example: 75 })
  @IsNumber()
  weight: number;

  @ApiProperty({ description: 'Height of the player in cm', example: 175 })
  @IsNumber()
  height: number;

  @ApiProperty({ description: 'Recent injuries', enum: ['none', 'muscle', 'joint', 'other'], example: 'none' })
  @IsString()
  @IsIn(['none', 'muscle', 'joint', 'other'])
  recentInjuries: string;

  @ApiProperty({ description: 'Recovery status', enum: ['fully_recovered', 'partially_recovered', 'ongoing_treatment', 'none'], example: 'none' })
  @IsString()
  @IsIn(['fully_recovered', 'partially_recovered', 'ongoing_treatment', 'none'])
  recoveryStatus: string;

  @ApiProperty({ description: 'Fitness level (1-5)', example: 4 })
  @IsNumber()
  fitnessLevel: number;

  @ApiProperty({ description: 'Weekly training hours', example: 10 })
  @IsNumber()
  trainingHours: number;

  @ApiProperty({ description: 'Average nightly sleep hours', example: 7 })
  @IsNumber()
  sleepHours: number;

  @ApiProperty({ description: 'Match intensity (1-5)', example: 3 })
  @IsNumber()
  matchIntensity: number;

  @ApiProperty({ description: 'Stress level (1-5)', example: 2 })
  @IsNumber()
  stressLevel: number;
}

export class InjuryDataDto {
  @ApiProperty({ description: 'Whether an injury occurred', example: true })
  @IsBoolean()
  injuryOccurred: boolean;

  @ApiProperty({ description: 'Type of injury', enum: ['muscle', 'joint', 'other', 'none'], example: 'muscle', required: false })
  @IsString()
  @IsIn(['muscle', 'joint', 'other', 'none'])
  @IsOptional()
  injuryType?: string;

  @ApiProperty({ description: 'Date of injury (ISO format)', example: '2025-07-16', required: false })
  @IsDateString()
  @IsOptional()
  injuryDate?: string;
}