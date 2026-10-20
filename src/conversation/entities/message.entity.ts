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
@Index('idx_messages_user_created', ['userId', 'createdAt'])
@Index('idx_chatId', ['chatId'])
@Index('idx_createdAt', ['createdAt'])
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  userId: string;

  @Column({ length: 20 })
  role: 'user' | 'model';

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', nullable: true })
  chatId: number;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chatId', foreignKeyConstraintName: 'fk_messages_chat' })
  chat: Chat;

  @CreateDateColumn()
  createdAt: Date;
}
