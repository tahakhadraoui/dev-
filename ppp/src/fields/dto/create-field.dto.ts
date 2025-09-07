import { IsString, IsOptional, IsNumber, IsBoolean, Min, Matches, IsInt } from 'class-validator';

export class CreateFieldDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @IsOptional()
  @IsInt()
  @Min(75)
  matchDuration?: number;

  @IsOptional()
  @IsBoolean()
  hasShowers?: boolean;

  @IsOptional()
  @IsBoolean()
  hasWater?: boolean;

  @IsOptional()
  @IsBoolean()
  isIndoor?: boolean;

  @IsOptional()
  @IsString()
  image?: string;

  @IsInt()
  @Min(1)
  numberOfTerrains: number;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  openingTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  closingTime?: string;
}