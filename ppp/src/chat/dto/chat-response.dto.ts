export class UserResponseDto {
  id: string
  firstName: string
  lastName: string
  profilePicture?: string
}

export class ChatMessageResponseDto {
  id: string
  content: string
  type: string
  fileUrl?: string
  fileName?: string
  sender: UserResponseDto
  isEdited: boolean
  editedAt?: Date
  createdAt: Date
}

export class ChatResponseDto {
  id: string
  type: string
  name?: string
  description?: string
  teamId?: string
  incompleteMatchId?: string
  participants: UserResponseDto[]
  participantCount: number
  lastMessage?: ChatMessageResponseDto
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class ChatWithMessagesResponseDto extends ChatResponseDto {
  messages: ChatMessageResponseDto[]
}
