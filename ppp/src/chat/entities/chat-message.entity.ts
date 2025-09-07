import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import { User } from "../../users/entities/user.entity"
import { Chat } from "./chat.entity"

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
  SYSTEM = "system",
}

@Entity("chat_messages")
export class ChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("text")
  content: string

  @Column({
    type: "enum",
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType

  @Column({ nullable: true })
  fileUrl: string

  @Column({ nullable: true })
  fileName: string

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "senderId" })
  sender: User

  @Column()
  senderId: string

  @ManyToOne(
    () => Chat,
    (chat) => chat.messages,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "chatId" })
  chat: Chat

  @Column()
  chatId: string

  @Column({ default: false })
  isEdited: boolean

  @Column({ nullable: true })
  editedAt: Date

  @Column({ default: false })
  isDeleted: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
