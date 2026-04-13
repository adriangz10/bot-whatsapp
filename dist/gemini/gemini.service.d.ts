import { ConfigService } from '@nestjs/config';
import { Content } from '@google/generative-ai';
import { ConversationService } from '../conversation/conversation.service';
import { RagService } from '../rag/rag.service';
export declare class GeminiService {
    private readonly configService;
    private readonly conversationService;
    private readonly ragService;
    private readonly genAI;
    constructor(configService: ConfigService, conversationService: ConversationService, ragService: RagService);
    chat(userId: string, userPrompt: string, loadHistory?: boolean): Promise<string>;
    clearHistory(userId: string): Promise<void>;
    getHistory(userId: string): Promise<Content[]>;
}
