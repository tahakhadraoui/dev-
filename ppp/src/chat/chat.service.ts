import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Chat, ChatType } from "./entities/chat.entity"
import { ChatMessage, MessageType } from "./entities/chat-message.entity"
import { User } from "../users/entities/user.entity"
import { Team } from "../teams/entities/team.entity"
import { SendMessageDto } from "./dto/send-message.dto"
import {
  ChatResponseDto,
  ChatWithMessagesResponseDto,
  ChatMessageResponseDto,
  UserResponseDto,
} from "./dto/chat-response.dto"
import { IncompleteMatch } from "src/matches/incomplete-match/incomplete-match.entity"

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(IncompleteMatch)
    private readonly incompleteMatchRepository: Repository<IncompleteMatch>,
  ) {}

  private mapUserToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
    }
  }

  private mapMessageToResponseDto(message: ChatMessage): ChatMessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      sender: this.mapUserToResponseDto(message.sender),
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
    }
  }

  private mapChatToResponseDto(chat: Chat): ChatResponseDto {
    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      description: chat.description,
      teamId: chat.teamId,
      incompleteMatchId: chat.incompleteMatchId,
      participants: chat.participants?.map((user) => this.mapUserToResponseDto(user)) || [],
      participantCount: chat.participants?.length || 0,
      lastMessage: chat.lastMessage ? this.mapMessageToResponseDto(chat.lastMessage) : undefined,
      isActive: chat.isActive,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }
  }

  async createTeamChat(teamId: string, currentUser: User): Promise<ChatResponseDto> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ["captain", "players"],
    })
    if (!team) {
      throw new NotFoundException("Team not found")
    }

    // Check if user is team captain or member
    const isTeamMember =
      team.captain.id === currentUser.id || team.players.some((player) => player.id === currentUser.id)
    if (!isTeamMember) {
      throw new ForbiddenException("You are not a member of this team")
    }

    // Check if chat already exists for this team
    let existingChat = await this.chatRepository.findOne({
      where: { teamId, type: ChatType.TEAM },
      relations: ["participants"],
    })

    if (existingChat) {
      // SYNC CHAT PARTICIPANTS WITH CURRENT TEAM MEMBERS
      const currentTeamMembers = [team.captain, ...team.players]
      const currentParticipantIds = existingChat.participants.map((p) => p.id)
      const teamMemberIds = currentTeamMembers.map((m) => m.id)

      // Find missing team members who should be in chat
      const missingMembers = currentTeamMembers.filter((member) => !currentParticipantIds.includes(member.id))

      // Find participants who are no longer team members
      const removedMembers = existingChat.participants.filter((participant) => !teamMemberIds.includes(participant.id))

      let chatUpdated = false

      // Add missing team members to chat
      if (missingMembers.length > 0) {
        console.log(
          `Adding ${missingMembers.length} missing team members to chat:`,
          missingMembers.map((m) => `${m.firstName} ${m.lastName} (${m.id})`),
        )

        existingChat.participants.push(...missingMembers)
        chatUpdated = true

        // Send system messages for each added member
        for (const member of missingMembers) {
          await this.sendSystemMessage(
            existingChat.id,
            `${member.firstName} ${member.lastName} rejoined the team chat! 🎉`,
            currentUser,
          )
        }
      }

      // Remove participants who are no longer team members
      if (removedMembers.length > 0) {
        console.log(
          `Removing ${removedMembers.length} former team members from chat:`,
          removedMembers.map((m) => `${m.firstName} ${m.lastName} (${m.id})`),
        )

        existingChat.participants = existingChat.participants.filter((participant) =>
          teamMemberIds.includes(participant.id),
        )
        chatUpdated = true

        // Send system messages for each removed member
        for (const member of removedMembers) {
          await this.sendSystemMessage(
            existingChat.id,
            `${member.firstName} ${member.lastName} left the team chat 👋`,
            currentUser,
          )
        }
      }

      // Save updated chat if changes were made
      if (chatUpdated) {
        existingChat = await this.chatRepository.save(existingChat)
      }

      return this.mapChatToResponseDto(existingChat)
    }

    // Create new team chat
    const participants = [team.captain, ...team.players]
    const chat = this.chatRepository.create({
      type: ChatType.TEAM,
      name: `${team.name} Team Chat`,
      description: `Chat for ${team.name} team members`,
      teamId: team.id,
      participants,
      isActive: true,
    })

    const savedChat = await this.chatRepository.save(chat)

    // Send welcome message, attributing it to currentUser
    await this.sendSystemMessage(savedChat.id, `Welcome to ${team.name} team chat! 🏆`, currentUser)

    return this.mapChatToResponseDto(savedChat)
  }

  async createIncompleteMatchChat(matchId: string, currentUser: User): Promise<ChatResponseDto> {
    const match = await this.incompleteMatchRepository.findOne({
      where: { id: matchId },
      relations: ["creator", "players", "pendingPlayers", "invitedPlayers"],
    })
    if (!match) {
      throw new NotFoundException("Match not found")
    }

    // Check if user is involved in the match
    const isMatchParticipant =
      match.creator.id === currentUser.id ||
      match.players.some((player) => player.id === currentUser.id) ||
      match.pendingPlayers.some((player) => player.id === currentUser.id) ||
      match.invitedPlayers.some((player) => player.id === currentUser.id)

    if (!isMatchParticipant) {
      throw new ForbiddenException("You are not a participant in this match")
    }

    // Check if chat already exists for this match
    let existingChat = await this.chatRepository.findOne({
      where: { incompleteMatchId: matchId, type: ChatType.INCOMPLETE_MATCH },
      relations: ["participants"],
    })

    if (existingChat) {
      // SYNC CHAT PARTICIPANTS WITH CURRENT MATCH PARTICIPANTS
      const currentMatchParticipants = [match.creator, ...match.players]
      const currentParticipantIds = existingChat.participants.map((p) => p.id)
      const matchParticipantIds = currentMatchParticipants.map((m) => m.id)

      // Find missing match participants who should be in chat
      const missingParticipants = currentMatchParticipants.filter(
        (participant) => !currentParticipantIds.includes(participant.id),
      )

      // Find chat participants who are no longer in the match
      const removedParticipants = existingChat.participants.filter(
        (participant) => !matchParticipantIds.includes(participant.id),
      )

      let chatUpdated = false

      // Add missing match participants to chat
      if (missingParticipants.length > 0) {
        console.log(
          `Adding ${missingParticipants.length} missing match participants to chat:`,
          missingParticipants.map((m) => `${m.firstName} ${m.lastName} (${m.id})`),
        )

        existingChat.participants.push(...missingParticipants)
        chatUpdated = true

        // Send system messages for each added participant
        for (const participant of missingParticipants) {
          await this.sendSystemMessage(
            existingChat.id,
            `${participant.firstName} ${participant.lastName} rejoined the match chat! 🎉`,
            currentUser,
          )
        }
      }

      // Remove participants who are no longer in the match (except creator)
      if (removedParticipants.length > 0) {
        const toRemove = removedParticipants.filter((p) => p.id !== match.creator.id)
        if (toRemove.length > 0) {
          console.log(
            `Removing ${toRemove.length} former match participants from chat:`,
            toRemove.map((m) => `${m.firstName} ${m.lastName} (${m.id})`),
          )

          existingChat.participants = existingChat.participants.filter(
            (participant) => matchParticipantIds.includes(participant.id) || participant.id === match.creator.id,
          )
          chatUpdated = true

          // Send system messages for each removed participant
          for (const participant of toRemove) {
            await this.sendSystemMessage(
              existingChat.id,
              `${participant.firstName} ${participant.lastName} left the match chat 👋`,
              currentUser,
            )
          }
        }
      }

      // Save updated chat if changes were made
      if (chatUpdated) {
        existingChat = await this.chatRepository.save(existingChat)
      }

      return this.mapChatToResponseDto(existingChat)
    }

    // Create new match chat with confirmed players
    const participants = [match.creator, ...match.players]
    const chat = this.chatRepository.create({
      type: ChatType.INCOMPLETE_MATCH,
      name: `${match.title} Match Chat`,
      description: `Chat for ${match.title} match players`,
      incompleteMatchId: match.id,
      participants,
      isActive: true,
    })

    const savedChat = await this.chatRepository.save(chat)

    // Send welcome message, attributing it to currentUser
    await this.sendSystemMessage(
      savedChat.id,
      `Welcome to ${match.title} match chat! ⚽ Match date: ${match.date} at ${match.startTime}`,
      currentUser,
    )

    return this.mapChatToResponseDto(savedChat)
  }

  async getUserChats(userId: string): Promise<ChatResponseDto[]> {
    const chats = await this.chatRepository
      .createQueryBuilder("chat")
      .leftJoinAndSelect("chat.participants", "participants")
      .leftJoinAndSelect("chat.messages", "lastMessage")
      .leftJoin("chat.messages", "allMessages")
      .where("participants.id = :userId", { userId })
      .andWhere("chat.isActive = true")
      .andWhere("lastMessage.id = (SELECT MAX(m.id) FROM chat_messages m WHERE m.chatId = chat.id)")
      .orderBy("chat.updatedAt", "DESC")
      .getMany()

    return chats.map((chat) => {
      const responseDto = this.mapChatToResponseDto(chat)
      if (chat.messages && chat.messages.length > 0) {
        responseDto.lastMessage = this.mapMessageToResponseDto(chat.messages[0])
      }
      return responseDto
    })
  }

  async getChatWithMessages(
    chatId: string,
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<ChatWithMessagesResponseDto> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ["participants"],
    })

    if (!chat) {
      throw new NotFoundException("Chat not found")
    }

    // Check if user is participant
    let isParticipant = chat.participants.some((participant) => participant.id === userId)

    // If user is not a participant, try to auto-add them if they should have access
    if (!isParticipant) {
      console.log(`User ${userId} not found in chat participants, checking if they should have access...`)

      const user = await this.userRepository.findOne({ where: { id: userId } })
      if (!user) {
        throw new NotFoundException("User not found")
      }

      let shouldHaveAccess = false

      // Check team chat access
      if (chat.teamId) {
        const team = await this.teamRepository.findOne({
          where: { id: chat.teamId },
          relations: ["captain", "players"],
        })

        if (team) {
          shouldHaveAccess = team.captain.id === userId || team.players.some((player) => player.id === userId)

          if (shouldHaveAccess) {
            console.log(`Auto-adding user ${user.firstName} ${user.lastName} to team chat`)
            chat.participants.push(user)
            await this.chatRepository.save(chat)
            await this.sendSystemMessage(chat.id, `${user.firstName} ${user.lastName} rejoined the team chat! 🎉`, user)
            isParticipant = true
          }
        }
      }

      // Check match chat access
      if (chat.incompleteMatchId && !shouldHaveAccess) {
        const match = await this.incompleteMatchRepository.findOne({
          where: { id: chat.incompleteMatchId },
          relations: ["creator", "players", "pendingPlayers", "invitedPlayers"],
        })

        if (match) {
          shouldHaveAccess =
            match.creator.id === userId ||
            match.players.some((player) => player.id === userId) ||
            match.pendingPlayers.some((player) => player.id === userId) ||
            match.invitedPlayers.some((player) => player.id === userId)

          if (shouldHaveAccess) {
            console.log(`Auto-adding user ${user.firstName} ${user.lastName} to match chat`)
            chat.participants.push(user)
            await this.chatRepository.save(chat)
            await this.sendSystemMessage(
              chat.id,
              `${user.firstName} ${user.lastName} rejoined the match chat! 🎉`,
              user,
            )
            isParticipant = true
          }
        }
      }
    }

    if (!isParticipant) {
      throw new ForbiddenException("You are not a participant in this chat")
    }

    const messages = await this.messageRepository.find({
      where: { chatId, isDeleted: false },
      relations: ["sender"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    })

    const chatResponse = this.mapChatToResponseDto(chat)
    return {
      ...chatResponse,
      messages: messages.reverse().map((message) => this.mapMessageToResponseDto(message)),
    }
  }

  async sendMessage(dto: SendMessageDto, userId: string): Promise<ChatMessageResponseDto> {
    const chat = await this.chatRepository.findOne({
      where: { id: dto.chatId },
      relations: ["participants"],
    })
    if (!chat) {
      throw new NotFoundException("Chat not found")
    }

    if (!chat.isActive) {
      throw new BadRequestException("Chat is not active")
    }

    // Check if user is participant
    const isParticipant = chat.participants.some((participant) => participant.id === userId)
    if (!isParticipant) {
      throw new ForbiddenException("You are not a participant in this chat")
    }

    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException("User not found")
    }

    const message = this.messageRepository.create({
      content: dto.content,
      type: dto.type || MessageType.TEXT,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      sender: user,
      senderId: userId,
      chat,
      chatId: dto.chatId,
    })

    const savedMessage = await this.messageRepository.save(message)

    // Update chat's updatedAt
    chat.updatedAt = new Date()
    await this.chatRepository.save(chat)

    return this.mapMessageToResponseDto(savedMessage)
  }

  async editMessage(messageId: string, newContent: string, userId: string): Promise<ChatMessageResponseDto> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ["sender", "chat"],
    })
    if (!message) {
      throw new NotFoundException("Message not found")
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only edit your own messages")
    }

    if (message.isDeleted) {
      throw new BadRequestException("Cannot edit deleted message")
    }

    message.content = newContent
    message.isEdited = true
    message.editedAt = new Date()

    const updatedMessage = await this.messageRepository.save(message)

    return this.mapMessageToResponseDto(updatedMessage)
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ["sender"],
    })
    if (!message) {
      throw new NotFoundException("Message not found")
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only delete your own messages")
    }

    message.isDeleted = true
    message.content = "This message has been deleted"
    await this.messageRepository.save(message)
  }

  async addParticipantToIncompleteMatchChat(matchId: string, userId: string, currentUser: User): Promise<void> {
    const chat = await this.chatRepository.findOne({
      where: { incompleteMatchId: matchId, type: ChatType.INCOMPLETE_MATCH },
      relations: ["participants"],
    })
    if (!chat) {
      return // Chat doesn't exist yet
    }

    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException("User not found")
    }

    // Check if user is already a participant
    const isAlreadyParticipant = chat.participants.some((participant) => participant.id === userId)
    if (!isAlreadyParticipant) {
      chat.participants.push(user)
      await this.chatRepository.save(chat)
      // Send system message, attributing it to currentUser
      await this.sendSystemMessage(chat.id, `${user.firstName} ${user.lastName} joined the match chat! 👋`, currentUser)
    }
  }

  async removeParticipantFromIncompleteMatchChat(matchId: string, userId: string, currentUser: User): Promise<void> {
    const chat = await this.chatRepository.findOne({
      where: { incompleteMatchId: matchId, type: ChatType.INCOMPLETE_MATCH },
      relations: ["participants"],
    })
    if (!chat) {
      return // Chat doesn't exist
    }

    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      return
    }

    chat.participants = chat.participants.filter((participant) => participant.id !== userId)
    await this.chatRepository.save(chat)

    // Send system message, attributing it to currentUser
    await this.sendSystemMessage(chat.id, `${user.firstName} ${user.lastName} left the match chat 👋`, currentUser)
  }

  private async sendSystemMessage(chatId: string, content: string, currentUser: User): Promise<void> {
    const message = this.messageRepository.create({
      content,
      type: MessageType.SYSTEM,
      chatId,
      senderId: currentUser.id, // Use currentUser's ID
      sender: currentUser,
      // Associate with currentUser
    })
    await this.messageRepository.save(message)
  }

  async deactivateIncompleteMatchChat(matchId: string): Promise<void> {
    const chat = await this.chatRepository.findOne({
      where: { incompleteMatchId: matchId, type: ChatType.INCOMPLETE_MATCH },
    })
    if (chat) {
      chat.isActive = false
      await this.chatRepository.save(chat)
    }
  }
}
