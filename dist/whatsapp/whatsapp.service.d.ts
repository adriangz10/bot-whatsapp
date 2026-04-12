import { ConfigService } from '@nestjs/config';
export declare class WhatsAppService {
    private readonly configService;
    private readonly accessToken;
    private readonly phoneNumberId;
    private readonly apiVersion;
    constructor(configService: ConfigService);
    private getApiUrl;
    sendTemplateMessage(to: string, templateName: string, languageCode?: string): Promise<any>;
    sendMessage(to: string, message: string): Promise<any>;
}
