import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RagService } from '../rag/rag.service';
export declare class GoogleDocsService implements OnModuleInit {
    private readonly configService;
    private readonly ragService;
    private readonly logger;
    private documentContent;
    private readonly documentId;
    private docsClient;
    constructor(configService: ConfigService, ragService: RagService);
    onModuleInit(): Promise<void>;
    private initializeClient;
    private getCredentials;
    private loadDocument;
    private extractText;
    getContext(): string;
    reload(): Promise<void>;
}
