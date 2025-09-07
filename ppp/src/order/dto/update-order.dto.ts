import { IsString, IsNumber, IsPositive, IsObject, IsOptional, IsEnum } from 'class-validator';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  shipping?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  tax?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  total?: number;

  @IsEnum(['pending', 'completed', 'shipped', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  shippingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    city: string;
    zipCode: string;
  };

  @IsObject()
  @IsOptional()
  paymentMethod?: {
    type: string;
    last4?: string;
  };
}