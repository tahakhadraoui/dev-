import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator"
import { MessageType } from "../entities/chat-message.entity"

export class SendMessageDto {
  @IsUUID()
  chatId: string

  @IsString()
  content: string

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType

  @IsOptional()
  @IsString()
  fileUrl?: string

  @IsOptional()
  @IsString()
  fileName?: string
}

export { MessageType }
