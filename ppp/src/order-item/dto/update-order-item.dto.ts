import { IsNumber, IsPositive, IsOptional } from 'class-validator';

export class UpdateOrderItemDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  orderId?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  productId?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;
}