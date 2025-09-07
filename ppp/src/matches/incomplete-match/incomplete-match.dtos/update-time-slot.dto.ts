import { IsDate, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTimeslotDto {
  @ApiProperty({ example: 'match101' })
  @IsUUID()
  matchId: string;

  @ApiProperty({ example: '2025-05-24' })
  @IsString()
  date: string;

  @ApiProperty({ example: '15:30' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '16:45' })
  @IsString()
  endTime: string;
}