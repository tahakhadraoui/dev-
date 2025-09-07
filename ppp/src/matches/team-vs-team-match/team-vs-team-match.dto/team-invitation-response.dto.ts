import { IsBoolean, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondToInviteDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID()
  matchId: string;

  @ApiProperty({ example: true, description: 'Set to true to accept, false to decline' })
  @IsNotEmpty()
  @IsBoolean()
  accept: boolean;
}
