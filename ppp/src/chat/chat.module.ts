import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { JwtModule } from "@nestjs/jwt"
import { ChatController } from "./chat.controller"
import { ChatService } from "./chat.service"
import { ChatGateway } from "./chat.gateway"
import { Chat } from "./entities/chat.entity"
import { ChatMessage } from "./entities/chat-message.entity"
import { User } from "../users/entities/user.entity"
import { Team } from "../teams/entities/team.entity"
import { IncompleteMatch } from "../matches/incomplete-match/incomplete-match.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatMessage, User, Team, IncompleteMatch]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
