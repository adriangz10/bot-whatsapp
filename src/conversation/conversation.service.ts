import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '@google/generative-ai';
import { Message } from './entities/message.entity';
import { ChatsService } from '../chats/chats.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
  ) {}

  async getHistory(userId: string, limit: number = 50): Promise<Content[]> {
    const messages = await this.messageRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Reverse to get chronological order
    return messages.reverse().map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));
  }

  async saveMessage(
    userId: string,
    role: 'user' | 'model',
    content: string,
    updateChat: boolean = true,
  ): Promise<Message> {
    // Asegurar que existe el chat
    let chatId: number | undefined;
    if (updateChat) {
      const chat = await this.chatsService.upsertByUserId(userId);
      chatId = chat.id;
    }

    const message = this.messageRepository.create({
      userId,
      role,
      content,
      chatId,
    });
    const savedMessage = await this.messageRepository.save(message);

    // Actualizar último mensaje en el chat
    if (updateChat && chatId) {
      await this.chatsService.updateLastMessage(chatId, content);

      if (role === 'user') {
        await this.chatsService.incrementUnread(chatId);
      }
    }

    return savedMessage;
  }

  async clearHistory(userId: string): Promise<void> {
    await this.messageRepository.delete({ userId });
  }

  async getAllUserIds(): Promise<string[]> {
    const result = await this.messageRepository
      .createQueryBuilder('message')
      .select('DISTINCT message.userId', 'userId')
      .getRawMany();

    return result.map((r) => r.userId);
  }
}