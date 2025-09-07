import { ApiProperty } from '@nestjs/swagger';

class UserResponseDto {
  @ApiProperty({ description: 'Unique identifier of the user' })
  id: string;

  @ApiProperty({ description: 'First name of the user' })
  firstName: string;

  @ApiProperty({ description: 'Last name of the user' })
  lastName: string;
}

export class NotificationResponseDto {
  @ApiProperty({ description: 'Unique identifier of the notification' })
  id: string;

  @ApiProperty({ description: 'Title of the notification' })
  title: string;

  @ApiProperty({ description: 'Message content of the notification' })
  message: string;

  @ApiProperty({ description: 'Type of the notification (e.g., reservation)' })
  type: string;

  @ApiProperty({ description: 'User associated with the notification', type: UserResponseDto })
  user: UserResponseDto;
}