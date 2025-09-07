import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export enum MatchType {
  INCOMPLETE = 'INCOMPLETE',
  TEAM_VS_TEAM = 'TEAM_VS_TEAM',
}

export class CreateRatingDto {
  @ApiProperty({ description: 'ID of the player being rated' })
  @IsUUID()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ description: 'ID of the match' })
  @IsUUID()
  @IsNotEmpty()
  matchId: string;

  @ApiProperty({ description: 'Type of the match', enum: MatchType })
  @IsEnum(MatchType)
  @IsNotEmpty()
  matchType: MatchType;

  @ApiProperty({ description: 'Rating score (4-10)' })
  @IsInt()
  @Min(4)
  @Max(10)
  score: number;
}