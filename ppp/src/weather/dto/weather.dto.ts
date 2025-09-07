import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetWeatherByCityDto {
  @ApiProperty({
    description: 'The name of the city in Tunisia (e.g., Tunis)',
    example: 'Tunis',
    type: String,
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'The date in YYYY-MM-DD format (e.g., 2025-07-15)',
    example: '2025-07-15',
    type: String,
    pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({
    description: 'The time in HH:MM format (e.g., 12:00)',
    example: '12:00',
    type: String,
    pattern: '^[0-9]{2}:[0-9]{2}$',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Time must be in HH:MM format' })
  time: string;
}