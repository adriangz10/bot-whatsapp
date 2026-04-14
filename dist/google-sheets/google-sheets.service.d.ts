import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RagService } from '../rag/rag.service';
export declare class GoogleSheetsService implements OnModuleInit {
    private readonly configService;
    private readonly ragService;
    private readonly logger;
    private sheetData;
    private sheetText;
    private readonly spreadsheetId;
    private sheetsClient;
    constructor(configService: ConfigService, ragService: RagService);
    onModuleInit(): Promise<void>;
    private initializeClient;
    private getCredentials;
    private loadSpreadsheet;
    private formatSheetText;
    findKeyword(userMessage: string): {
        answer: string;
        media: string;
    } | null;
    getData(): Record<string, string>[];
    getContext(): string;
    reload(): Promise<void>;
}
