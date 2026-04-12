import { ConfigService } from '@nestjs/config';
import { Content } from '@google/generative-ai';
import { ConversationService } from '../conversation/conversation.service';
import { GoogleDocsService } from '../google-docs/google-docs.service';
export declare class GeminiService {
    private readonly configService;
    private readonly conversationService;
    private readonly googleDocsService;
    private readonly genAI;
    constructor(configService: ConfigService, conversationService: ConversationService, googleDocsService: GoogleDocsService);
    chat(userId: string, userPrompt: string): Promise<string>;
    clearHistory(userId: string): Promise<void>;
    getHistory(userId: string): Promise<Content[]>;
}
