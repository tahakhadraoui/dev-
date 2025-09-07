import { ApiProperty } from "@nestjs/swagger"
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator"

export class FilterFieldsDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxPricePerHour?: number

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  hasShowers?: boolean

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  hasWater?: boolean


  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isIndoor?: boolean

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  date?: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  startTime?: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  endTime?: string
}
