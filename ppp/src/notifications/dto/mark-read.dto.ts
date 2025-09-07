import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsUUID } from "class-validator"

export class MarkReadDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  notificationId: string
}
