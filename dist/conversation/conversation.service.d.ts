import { Repository } from 'typeorm';
import { Content } from '@google/generative-ai';
import { Message } from './entities/message.entity';
import { ChatsService } from '../chats/chats.service';
import { EventsService } from '../events/events.service';
export declare class ConversationService {
    private readonly messageRepository;
    private readonly chatsService;
    private readonly eventsService;
    constructor(messageRepository: Repository<Message>, chatsService: ChatsService, eventsService: EventsService);
    getHistory(userId: string, limit?: number): Promise<Content[]>;
    saveMessage(userId: string, role: 'user' | 'model', content: string, updateChat?: boolean): Promise<Message>;
    clearHistory(userId: string): Promise<void>;
    getAllUserIds(): Promise<string[]>;
}
