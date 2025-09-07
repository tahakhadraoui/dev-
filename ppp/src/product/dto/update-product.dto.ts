import { IsString, IsNumber, IsPositive, IsOptional, IsEnum, IsInt, Min } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  originalPrice?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsEnum(['active', 'inactive', 'out_of_stock'])
  @IsOptional()
  status?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  rating?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reviewCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  salesCount?: number;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  categoryId?: number;
}