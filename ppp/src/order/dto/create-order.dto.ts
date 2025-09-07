import { IsString, IsNotEmpty, IsNumber, IsPositive, IsArray, IsObject, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsNumber()
  @IsPositive()
  productId: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @IsNumber()
  @IsPositive()
  subtotal: number;

  @IsNumber()
  @Min(0)
  shipping: number;

  @IsNumber()
  @IsPositive()
  tax: number;

  @IsNumber()
  @IsPositive()
  total: number;

  @IsEnum(['pending', 'completed', 'shipped', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsObject()
  @IsNotEmpty()
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    city: string;
    zipCode: string;
  };

  @IsObject()
  @IsNotEmpty()
  paymentMethod: {
    type: string;
    last4?: string;
  };

  @IsArray()
  @IsNotEmpty()
  items: CreateOrderItemDto[];
}