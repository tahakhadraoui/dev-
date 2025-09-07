import { IsNotEmpty, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinRequestDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  matchId: string;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @IsNotEmpty()
  age: number;

  @ApiProperty({ example: 3.5 })
  @IsNumber()
  @IsNotEmpty()
  skillLevel: number;
}