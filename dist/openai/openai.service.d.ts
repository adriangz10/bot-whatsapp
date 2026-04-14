import { ConfigService } from '@nestjs/config';
import { ConversationService } from '../conversation/conversation.service';
import { RagService } from '../rag/rag.service';
export declare class OpenAIService {
    private readonly configService;
    private readonly conversationService;
    private readonly ragService;
    private readonly openai;
    constructor(configService: ConfigService, conversationService: ConversationService, ragService: RagService);
    chat(userId: string, userPrompt: string, loadHistory?: boolean): Promise<string>;
    transcribe(audioBuffer: Buffer, filename?: string): Promise<string>;
    clearHistory(userId: string): Promise<void>;
    getHistory(userId: string): Promise<import("@google/generative-ai").Content[]>;
}
