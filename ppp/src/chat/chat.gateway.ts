import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
   OnGatewayConnection,
   OnGatewayDisconnect,
} from "@nestjs/websockets"
import  { Server, Socket } from "socket.io"
import { Injectable } from "@nestjs/common"
import  { JwtService } from "@nestjs/jwt"
import  { ChatService } from "./chat.service"
import  { SendMessageDto } from "./dto/send-message.dto"
import { MessageType } from "./dto/send-message.dto"

interface AuthenticatedSocket extends Socket {
  userId?: string
  user?: any
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/ws",
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private connectedUsers = new Map<string, AuthenticatedSocket>()

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      console.log(`Client attempting to connect: ${client.id}`)

      // Extract token from handshake auth or headers
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace("Bearer ", "")

      if (!token) {
        console.log("No token provided, disconnecting client")
        client.disconnect()
        return
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token)
      client.userId = payload.sub
      client.user = payload

      // Store connected user
      if (client.userId) {
        this.connectedUsers.set(client.userId, client)
        console.log(`User ${client.userId} connected via WebSocket`)
      }

      // Send connection confirmation
      client.emit("connected", { message: "Connected successfully" })
    } catch (error) {
      console.log("Authentication failed:", error.message)
      client.emit("error", { message: "Authentication failed" })
      client.disconnect()
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId)
      console.log(`User ${client.userId} disconnected`)
    }
  }

  handleConnect(client: AuthenticatedSocket, data: any) {
    console.log("Received connect message:", data)
    client.emit("connection_confirmed", { message: "Connection confirmed" })
  }

  @SubscribeMessage("join_chat")
  handleJoinChat(client: AuthenticatedSocket, data: { chatId: string }) {
    console.log(`User ${client.userId} joining chat: ${data.chatId}`)
    client.join(`chat_${data.chatId}`)
    client.emit("joined_chat", { chatId: data.chatId })
  }

  @SubscribeMessage("leave_chat")
  handleLeaveChat(client: AuthenticatedSocket, data: { chatId: string }) {
    console.log(`User ${client.userId} leaving chat: ${data.chatId}`)
    client.leave(`chat_${data.chatId}`)
    client.emit("left_chat", { chatId: data.chatId })
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(client: AuthenticatedSocket, data: { chatId: string; content: string; type?: string }) {
    try {
      console.log(`User ${client.userId} sending message to chat ${data.chatId}`)

      if (!client.userId) {
        throw new Error("User ID is missing from socket connection")
      }

      // Save message to database using existing service
      const sendMessageDto: SendMessageDto = {
        chatId: data.chatId,
        content: data.content,
        type: data.type as MessageType || MessageType.TEXT,
      }

      const savedMessage = await this.chatService.sendMessage(sendMessageDto, client.userId)

      // Broadcast message to all users in the chat room
      this.server.to(`chat_${data.chatId}`).emit("message_received", {
        type: "message_received",
        chatId: data.chatId,
        data: savedMessage,
      })

      console.log(`Message sent successfully to chat ${data.chatId}`)
    } catch (error) {
      console.error("Error sending message:", error)
      client.emit("error", { message: "Failed to send message", error: error.message })
    }
  }

  @SubscribeMessage("edit_message")
  async handleEditMessage(client: AuthenticatedSocket, data: { messageId: string; content: string }) {
    try {
      console.log(`User ${client.userId} editing message ${data.messageId}`)

      if (!client.userId) {
        throw new Error("User ID is missing from socket connection")
      }

      const updatedMessage = await this.chatService.editMessage(data.messageId, data.content, client.userId)

      // Broadcast updated message to all users in relevant chats
      // Note: You might need to get the chatId from the message
      this.server.emit("message_updated", {
        type: "message_updated",
        data: updatedMessage,
      })

      console.log(`Message ${data.messageId} edited successfully`)
    } catch (error) {
      console.error("Error editing message:", error)
      client.emit("error", { message: "Failed to edit message", error: error.message })
    }
  }

  @SubscribeMessage("delete_message")
  async handleDeleteMessage(client: AuthenticatedSocket, data: { messageId: string }) {
    try {
      console.log(`User ${client.userId} deleting message ${data.messageId}`)

      if (!client.userId) {
        throw new Error("User ID is missing from socket connection")
      }

      await this.chatService.deleteMessage(data.messageId, client.userId)

      // Broadcast message deletion
      this.server.emit("message_deleted", {
        type: "message_deleted",
        messageId: data.messageId,
      })

      console.log(`Message ${data.messageId} deleted successfully`)
    } catch (error) {
      console.error("Error deleting message:", error)
      client.emit("error", { message: "Failed to delete message", error: error.message })
    }
  }

  @SubscribeMessage("ping")
  handlePing(client: AuthenticatedSocket) {
    client.emit("pong")
  }

  // Method to send system messages when users join/leave
  async notifyUserJoined(chatId: string, userId: string, userName: string) {
    this.server.to(`chat_${chatId}`).emit("user_joined", {
      type: "user_joined",
      chatId,
      userId,
      message: `${userName} joined the chat`,
    })
  }

  async notifyUserLeft(chatId: string, userId: string, userName: string) {
    this.server.to(`chat_${chatId}`).emit("user_left", {
      type: "user_left",
      chatId,
      userId,
      message: `${userName} left the chat`,
    })
  }
}
