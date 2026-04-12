import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './whatsapp.dto';
import { WhatsAppWebhookDto } from './whatsapp-webhook.dto';
import { GeminiService } from '../gemini/gemini.service';
export declare class WhatsAppController {
    private readonly whatsappService;
    private readonly geminiService;
    private readonly configService;
    constructor(whatsappService: WhatsAppService, geminiService: GeminiService, configService: ConfigService);
    sendMessage(body: SendMessageDto): Promise<any>;
    verifyWebhook(mode: string, challenge: string, token: string): string | number;
    handleWebhook(body: WhatsAppWebhookDto): Promise<string>;
}
