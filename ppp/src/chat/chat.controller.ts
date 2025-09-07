import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SendMessageDto } from "./dto/send-message.dto";
import { ChatResponseDto, ChatWithMessagesResponseDto, ChatMessageResponseDto } from "./dto/chat-response.dto";

@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("team/:teamId")
  async createTeamChat(@Param("teamId") teamId: string, @Request() req: any): Promise<ChatResponseDto> {
    return this.chatService.createTeamChat(teamId, req.user);
  }

  @Post("match/:matchId")
  async createIncompleteMatchChat(@Param("matchId") matchId: string, @Request() req: any): Promise<ChatResponseDto> {
    return this.chatService.createIncompleteMatchChat(matchId, req.user);
  }

  @Get("my-chats")
  async getUserChats(@Request() req: any): Promise<ChatResponseDto[]> {
    return this.chatService.getUserChats(req.user.id);
  }

  @Get(":chatId")
  async getChatWithMessages(
    @Param("chatId") chatId: string,
    @Query("page", ParseIntPipe) page: number = 1,
    @Query("limit", ParseIntPipe) limit: number = 50,
    @Request() req: any,
  ): Promise<ChatWithMessagesResponseDto> {
    return this.chatService.getChatWithMessages(chatId, req.user.id, page, limit);
  }

  @Post("message")
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @Request() req: any): Promise<ChatMessageResponseDto> {
    return this.chatService.sendMessage(sendMessageDto, req.user.id);
  }

  @Put("message/:messageId")
  async editMessage(
    @Param("messageId") messageId: string,
    @Body("content") content: string,
    @Request() req: any,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.editMessage(messageId, content, req.user.id);
  }

  @Delete("message/:messageId")
  async deleteMessage(@Param("messageId") messageId: string, @Request() req: any): Promise<void> {
    return this.chatService.deleteMessage(messageId, req.user.id);
  }

  @Post("match/:matchId/participant/:userId")
  async addParticipantToIncompleteMatchChat(
    @Param("matchId") matchId: string,
    @Param("userId") userId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.chatService.addParticipantToIncompleteMatchChat(matchId, userId, req.user);
  }

  @Delete("match/:matchId/participant/:userId")
  async removeParticipantFromIncompleteMatchChat(
    @Param("matchId") matchId: string,
    @Param("userId") userId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.chatService.removeParticipantFromIncompleteMatchChat(matchId, userId, req.user);
  }
}