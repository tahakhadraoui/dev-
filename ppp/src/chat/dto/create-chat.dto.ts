import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator"
import { ChatType } from "../entities/chat.entity"

export class CreateChatDto {
  @IsEnum(ChatType)
  type: ChatType

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsUUID()
  teamId?: string

  @IsOptional()
  @IsUUID()
  incompleteMatchId?: string
}
