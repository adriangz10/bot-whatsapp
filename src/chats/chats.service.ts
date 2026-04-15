import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, ChatStatus, ChatPriority } from './entities/chat.entity';
import { Message } from '../conversation/entities/message.entity';
import { UpdateChatDto, CreateChatDto } from './dto/chat.dto';
import { EventsService } from '../events/events.service';

export interface ChatFilters {
  status?: ChatStatus;
  priority?: ChatPriority;
  search?: string;
  tags?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly eventsService: EventsService,
  ) {}

  async findAll(
    filters: ChatFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Chat>> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.client', 'client');

    // Aplicar filtros
    if (filters.status) {
      query.andWhere('chat.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      query.andWhere('chat.priority = :priority', { priority: filters.priority });
    }

    if (filters.search) {
      query.andWhere(
        '(chat.userId LIKE :search OR chat.userName LIKE :search OR chat.lastMessage LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      // Buscar chats que contengan alguna de las etiquetas
      query.andWhere('JSON_OVERLAPS(chat.tags, :tags)', { tags: JSON.stringify(filters.tags) });
    }

    // Ordenamiento
    const sortField = pagination.sortBy.startsWith('chat.')
      ? pagination.sortBy
      : `chat.${pagination.sortBy}`;
    query.orderBy(sortField, pagination.sortOrder);

    // Paginación
    const skip = (pagination.page - 1) * pagination.limit;
    query.skip(skip).take(pagination.limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findOne(id: number): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: { id },
      relations: {
        client: true,
      },
    });
  }

  async findByUserId(userId: string): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: { userId },
      relations: {
        client: true,
      },
    });
  }

  async create(createChatDto: CreateChatDto): Promise<Chat> {
    const chat = this.chatRepository.create({
      userId: createChatDto.userId,
      userName: createChatDto.userName,
      clientId: createChatDto.clientId ?? null,
      status: ChatStatus.ACTIVE,
      priority: ChatPriority.MEDIUM,
      unreadCount: 0,
    });
    return this.chatRepository.save(chat);
  }

  async update(id: number, updateChatDto: UpdateChatDto): Promise<Chat | null> {
    await this.chatRepository.update(id, updateChatDto);
    const updated = await this.findOne(id);
    if (updated) {
      this.eventsService.emit('chat_updated', updated);
    }
    return updated;
  }

  async upsertByUserId(userId: string, userName?: string): Promise<Chat> {
    let chat = await this.findByUserId(userId);

    if (!chat) {
      chat = await this.create({ userId, userName });
    } else if (userName && chat.userName !== userName) {
      chat = (await this.update(chat.id, { userName })) || chat;
    }

    return chat;
  }

  async updateLastMessage(chatId: number, message: string): Promise<void> {
    await this.chatRepository.update(chatId, {
      lastMessage: message,
      lastMessageAt: new Date(),
    });
  }

  async incrementUnread(chatId: number): Promise<void> {
    await this.chatRepository.increment({ id: chatId }, 'unreadCount', 1);
  }

  async markAsRead(chatId: number): Promise<void> {
    await this.chatRepository.update(chatId, { unreadCount: 0 });
    const updated = await this.findOne(chatId);
    if (updated) {
      this.eventsService.emit('chat_updated', updated);
    }
  }

  async getChatWithMessages(id: number): Promise<Chat | null> {
    const chat = await this.findOne(id);
    if (!chat) return null;

    const messages = await this.messageRepository.find({
      where: { chatId: id },
      order: { createdAt: 'ASC' },
    });

    return { ...chat, messages };
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<ChatStatus, number>;
    byPriority: Record<ChatPriority, number>;
    unread: number;
  }> {
    const total = await this.chatRepository.count();
    const unread = await this.chatRepository
      .createQueryBuilder('chat')
      .select('SUM(chat.unreadCount)', 'total')
      .getRawOne()
      .then((result) => Number(result?.total || 0));

    const byStatus = await this.getGroupedCount('status');
    const byPriority = await this.getGroupedCount('priority');

    return { total, byStatus, byPriority, unread };
  }

  private async getGroupedCount(field: 'status' | 'priority'): Promise<Record<string, number>> {
    const result = await this.chatRepository
      .createQueryBuilder('chat')
      .select(`chat.${field}`, field)
      .addSelect('COUNT(*)', 'count')
      .groupBy(`chat.${field}`)
      .getRawMany();

    return result.reduce(
      (acc, item) => {
        acc[item[field]] = Number(item.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async delete(id: number): Promise<void> {
    await this.chatRepository.delete(id);
  }

  isInactive(chat: Chat, timeoutMinutes: number = 30): boolean {
    if (!chat.lastMessageAt) return false;
    const elapsed = Date.now() - new Date(chat.lastMessageAt).getTime();
    return elapsed > timeoutMinutes * 60 * 1000;
  }

  async reactivate(chatId: number): Promise<void> {
    await this.chatRepository.update(chatId, { status: ChatStatus.ACTIVE });
    const updated = await this.findOne(chatId);
    if (updated) {
      this.eventsService.emit('chat_updated', updated);
    }
  }
}
