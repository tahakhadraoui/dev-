import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";
import { IsBoolean, IsOptional, IsString, IsDate } from "class-validator";
import { Type } from "class-transformer";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isLoggedOut?: boolean;

  @ApiPropertyOptional({ example: "someRefreshTokenValue" })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ example: "1998-05-28" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth?: Date;
  
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
}