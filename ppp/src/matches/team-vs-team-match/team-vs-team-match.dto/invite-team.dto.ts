import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteTeamDto {
  @ApiProperty({ example: 'AlphaTeam' })
  @IsNotEmpty()
  @IsString()
  teamName: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID()
  matchId: string;
}