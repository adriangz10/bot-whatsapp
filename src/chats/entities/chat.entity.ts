import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Message } from '../../conversation/entities/message.entity';

export enum ChatStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  ARCHIVED = 'archived',
}

export enum ChatPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 100 })
  userId: string;

  @Column({ length: 255, nullable: true })
  userName: string;

  @Column({ type: 'text', nullable: true })
  profilePictureUrl: string;

  @Column({ type: 'text', nullable: true })
  lastMessage: string;

  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date;

  @Column({
    type: 'enum',
    enum: ChatStatus,
    default: ChatStatus.ACTIVE,
  })
  status: ChatStatus;

  @Column({
    type: 'enum',
    enum: ChatPriority,
    default: ChatPriority.MEDIUM,
  })
  priority: ChatPriority;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', default: 0 })
  unreadCount: number;

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}