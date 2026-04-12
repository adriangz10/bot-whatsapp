import { GeminiService } from './gemini.service';
export declare class GeminiController {
    private readonly geminiService;
    constructor(geminiService: GeminiService);
    testGemini(prompt: string): Promise<string>;
    getConversation(userId: string): Promise<import("@google/generative-ai").Content[]>;
    clearConversation(userId: string): Promise<{
        message: string;
    }>;
}
