import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsDate, IsBoolean, IsUrl } from "class-validator";
import { Type } from "class-transformer";
import { UserRole } from "../../common/enums/user-role.enum";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "John" })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Password123!" })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.PLAYER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: "Paris" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "+33123456789" })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: "https://example.com/profile.jpg" })
  @IsOptional()
  profilePicture?: string;

  @ApiPropertyOptional({ example: "I love playing soccer!" })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isReplacementPlayer?: boolean;

  @ApiPropertyOptional({ example: "1998-05-28" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth?: Date;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}