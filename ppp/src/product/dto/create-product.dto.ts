import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsEnum, IsInt, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  originalPrice?: number;

  @IsString()
  @IsNotEmpty()
  image: string;

  @IsInt()
  @Min(0)
  stock: number;

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
  categoryId: number;
}