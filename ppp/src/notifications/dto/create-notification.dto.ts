import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID of the user receiving the notification (UUID)' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Title of the notification' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Message content of the notification' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Type of notification (e.g., rating, reservation, match)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'ID of the related entity (e.g., ratingId, matchId)', required: false })
  @IsString()
  @IsOptional()
  relatedId?: string;
}