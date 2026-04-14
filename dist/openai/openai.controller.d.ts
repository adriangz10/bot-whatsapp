import { OpenAIService } from './openai.service';
export declare class OpenAIController {
    private readonly openaiService;
    constructor(openaiService: OpenAIService);
    testOpenAI(prompt: string): Promise<string>;
    getConversation(userId: string): Promise<import("@google/generative-ai").Content[]>;
    clearConversation(userId: string): Promise<{
        message: string;
    }>;
}
