import { ConfigService } from '@nestjs/config';
import { Content } from '@google/generative-ai';
import { ConversationService } from '../conversation/conversation.service';
import { RagService } from '../rag/rag.service';
export interface AppointmentIntentResult {
    action: 'create' | 'reschedule' | 'cancel' | 'none';
    intentDetected: boolean;
    summary: string | null;
    description: string | null;
    startDateTime: string | null;
    endDateTime: string | null;
    targetStartDateTime: string | null;
    targetEndDateTime: string | null;
    missingFields: string[];
    reply: string | null;
}
export declare class GeminiService {
    private readonly configService;
    private readonly conversationService;
    private readonly ragService;
    private readonly genAI;
    constructor(configService: ConfigService, conversationService: ConversationService, ragService: RagService);
    chat(userId: string, userPrompt: string, loadHistory?: boolean): Promise<string>;
    detectAppointmentIntent(userId: string, userPrompt: string, loadHistory?: boolean): Promise<AppointmentIntentResult>;
    clearHistory(userId: string): Promise<void>;
    getHistory(userId: string): Promise<Content[]>;
}
