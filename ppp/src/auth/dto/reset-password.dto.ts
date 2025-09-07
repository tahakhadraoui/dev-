import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"

export class ResetPasswordDto {
  @ApiProperty({ example: "user@example.com" })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({ example: "123456" })
  @IsNotEmpty()
  @IsString()
  resetCode: string

  @ApiProperty({ example: "newPassword123" })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string
}
