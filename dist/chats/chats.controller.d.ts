import { ChatsService } from './chats.service';
import { UpdateChatDto, CreateChatDto } from './dto/chat.dto';
import { ChatStatus, ChatPriority } from './entities/chat.entity';
export declare class ChatsController {
    private readonly chatsService;
    constructor(chatsService: ChatsService);
    findAll(page?: string, limit?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC', status?: ChatStatus, priority?: ChatPriority, search?: string, tags?: string): Promise<import("./chats.service").PaginatedResult<import("./entities/chat.entity").Chat>>;
    getStats(): Promise<{
        total: number;
        byStatus: Record<ChatStatus, number>;
        byPriority: Record<ChatPriority, number>;
        unread: number;
    }>;
    findOne(id: number): Promise<import("./entities/chat.entity").Chat | null>;
    getChatWithMessages(id: number): Promise<import("./entities/chat.entity").Chat | null>;
    create(createChatDto: CreateChatDto): Promise<import("./entities/chat.entity").Chat>;
    update(id: number, updateChatDto: UpdateChatDto): Promise<import("./entities/chat.entity").Chat | null>;
    markAsRead(id: number): Promise<{
        message: string;
    }>;
    updateStatus(id: number, status: ChatStatus): Promise<import("./entities/chat.entity").Chat | null>;
    updatePriority(id: number, priority: ChatPriority): Promise<import("./entities/chat.entity").Chat | null>;
    updateTags(id: number, tags: string[]): Promise<import("./entities/chat.entity").Chat | null>;
    updateNotes(id: number, notes: string): Promise<import("./entities/chat.entity").Chat | null>;
    delete(id: number): Promise<{
        message: string;
    }>;
}
