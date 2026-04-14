import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './whatsapp.dto';
import { WhatsAppWebhookDto } from './whatsapp-webhook.dto';
import { GeminiService } from '../gemini/gemini.service';
import { OpenAIService } from '../openai/openai.service';
import { ChatsService } from '../chats/chats.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConversationService } from '../conversation/conversation.service';
export declare class WhatsAppController {
    private readonly whatsappService;
    private readonly geminiService;
    private readonly openaiService;
    private readonly configService;
    private readonly chatsService;
    private readonly googleSheetsService;
    private readonly conversationService;
    constructor(whatsappService: WhatsAppService, geminiService: GeminiService, openaiService: OpenAIService, configService: ConfigService, chatsService: ChatsService, googleSheetsService: GoogleSheetsService, conversationService: ConversationService);
    sendMessage(body: SendMessageDto): Promise<any>;
    verifyWebhook(mode: string, challenge: string, token: string): string | number;
    handleWebhook(body: WhatsAppWebhookDto): Promise<string>;
}
