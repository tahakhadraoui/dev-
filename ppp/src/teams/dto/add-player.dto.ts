import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsUUID } from "class-validator"

export class AddPlayerDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  playerId: string
}
