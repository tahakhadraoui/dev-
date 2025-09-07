import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm"
import { User } from "../../users/entities/user.entity"
import { ChatMessage } from "./chat-message.entity"

export enum ChatType {
  TEAM = "team",
  INCOMPLETE_MATCH = "incomplete_match",
}

@Entity("chats")
export class Chat {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: ChatType,
  })
  type: ChatType

  @Column({ nullable: true })
  name: string

  @Column({ nullable: true })
  description: string

  // For team chats
  @Column({ nullable: true })
  teamId: string

  // For incomplete match chats
  @Column({ nullable: true })
  incompleteMatchId: string

  @ManyToMany(() => User)
  @JoinTable({
    name: "chat_participants",
    joinColumn: { name: "chatId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "userId", referencedColumnName: "id" },
  })
  participants: User[]

  @OneToMany(
    () => ChatMessage,
    (message) => message.chat,
    { cascade: true },
  )
  messages: ChatMessage[]

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Virtual property for participant count
  participantCount?: number

  // Virtual property for last message
  lastMessage?: ChatMessage
}
