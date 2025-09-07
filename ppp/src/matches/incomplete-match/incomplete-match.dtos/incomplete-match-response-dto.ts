import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsEnum, IsDate, IsInt, IsNumber, IsBoolean, IsArray, IsOptional } from 'class-validator';
import { MatchStatus } from 'src/common/enums/match-status.enum';
import { MatchType } from 'src/common/enums/match-type.enum';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';

// DTO for User (simplified to include only necessary fields)
export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;
}

// DTO for Field (simplified to include only necessary fields)
export class FieldResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Central Park Field' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123 Main St, Tunis' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Tunis' })
  @IsString()
  city: string;
}

// DTO for Reservation (simplified to include only necessary fields)
export class ReservationResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: '2025-05-20T14:00:00Z' })
  @IsDate()
  date: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '15:30' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 'PENDING' })
  @IsEnum(ReservationStatus)
  reservedStatus: string;

  @ApiPropertyOptional({ example: 'Pending, awaiting owner approval' })
  @IsOptional()
  @IsString()
  statusComment?: string;
}

export class IncompleteMatchResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: MatchType.INCOMPLETE })
  @IsEnum(MatchType)
  type: MatchType;

  @ApiProperty({ example: 'Friendly Match' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Tunis' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'A friendly match at the local field' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: MatchStatus.PENDING })
  @IsEnum(MatchStatus)
  status: MatchStatus;

  @ApiPropertyOptional({ example: '+21655887799' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: '2025-05-20T14:00:00Z' })
  @IsString()
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

  @ApiProperty({ example: '2025-05-20T10:00:00Z' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ example: '2025-05-20T12:00:00Z' })
  @IsDate()
  updatedAt: Date;

  @ApiProperty({ type: UserResponseDto })
  creator: UserResponseDto;

  @ApiProperty({ type: FieldResponseDto })
  field: FieldResponseDto;

  @ApiProperty({ type: [ReservationResponseDto] })
  @IsArray()
  reservations: ReservationResponseDto[];

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
  initialCurrentPlayers: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  currentPlayers: number;

  @ApiProperty({ example: 14 })
  @IsInt()
  maxPlayers: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  requiresApproval: boolean;

  @ApiProperty({ type: [UserResponseDto] })
  @IsArray()
  players: UserResponseDto[];

  @ApiProperty({ type: [UserResponseDto] })
  @IsArray()
  pendingPlayers: UserResponseDto[];
  @ApiProperty({ type: [UserResponseDto] })
  @IsArray()
  invitedPlayers: UserResponseDto[];
  
}