import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsInt, Min, IsBoolean, IsUrl } from "class-validator";
import { Type } from "class-transformer";
import { UserRole } from "../../common/enums/user-role.enum";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "Password123!" })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: "John" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PLAYER })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({ example: "+33123456789" })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: "Paris" })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: "I love playing soccer!" })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: "https://example.com/profile.jpg" })
  @IsOptional()
  @IsUrl()
  profilePicture?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isReplacementPlayer?: boolean;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  age?: number;
}