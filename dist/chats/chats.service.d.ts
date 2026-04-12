import { Repository } from 'typeorm';
import { Chat, ChatStatus, ChatPriority } from './entities/chat.entity';
import { Message } from '../conversation/entities/message.entity';
import { UpdateChatDto, CreateChatDto } from './dto/chat.dto';
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
export declare class ChatsService {
    private readonly chatRepository;
    private readonly messageRepository;
    constructor(chatRepository: Repository<Chat>, messageRepository: Repository<Message>);
    findAll(filters: ChatFilters, pagination: PaginationParams): Promise<PaginatedResult<Chat>>;
    findOne(id: number): Promise<Chat | null>;
    findByUserId(userId: string): Promise<Chat | null>;
    create(createChatDto: CreateChatDto): Promise<Chat>;
    update(id: number, updateChatDto: UpdateChatDto): Promise<Chat | null>;
    upsertByUserId(userId: string, userName?: string): Promise<Chat>;
    updateLastMessage(chatId: number, message: string): Promise<void>;
    incrementUnread(chatId: number): Promise<void>;
    markAsRead(chatId: number): Promise<void>;
    getChatWithMessages(id: number): Promise<Chat | null>;
    getStats(): Promise<{
        total: number;
        byStatus: Record<ChatStatus, number>;
        byPriority: Record<ChatPriority, number>;
        unread: number;
    }>;
    private getGroupedCount;
    delete(id: number): Promise<void>;
}
