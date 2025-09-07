import { PartialType } from "@nestjs/swagger"
import { CreateFieldDto } from "./create-field.dto"
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

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

  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfTerrains?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  openingTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  closingTime?: string;
}

export class FilterFieldsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  maxPricePerHour?: number;

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
  date?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;
}