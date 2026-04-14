import { ConfigService } from '@nestjs/config';
export declare class WhatsAppService {
    private readonly configService;
    private readonly accessToken;
    private readonly phoneNumberId;
    private readonly apiVersion;
    constructor(configService: ConfigService);
    private getApiUrl;
    sendTemplateMessage(to: string, templateName: string, languageCode?: string): Promise<any>;
    getProfilePicture(phoneNumber: string): Promise<string | null>;
    sendMessage(to: string, message: string): Promise<any>;
    sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<any>;
}
