import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString, MinLength } from "class-validator"

export class ChangePasswordDto {
  @ApiProperty({ example: "currentPassword123" })
  @IsNotEmpty()
  @IsString()
  currentPassword: string

  @ApiProperty({ example: "newPassword456" })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string
}
