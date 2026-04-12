import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class GoogleDocsService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private documentContent;
    private readonly documentId;
    private docsClient;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    private initializeClient;
    private getCredentials;
    private loadDocument;
    private extractText;
    getContext(): string;
    reload(): Promise<void>;
}
