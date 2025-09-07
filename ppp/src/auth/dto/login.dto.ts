import { IsEmail, IsNotEmpty, IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class LoginDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({ example: "Password123!" })
  @IsNotEmpty()
  @IsString()
  password: string
}
