import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Chat } from '../../chats/entities/chat.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 100 })
  userId: string;

  @Column({ length: 20 })
  role: 'user' | 'model';

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', nullable: true })
  chatId: number;

  @ManyToOne(() => Chat, (chat) => chat.messages)
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @CreateDateColumn()
  createdAt: Date;
}