import { GoogleSheetsService } from './google-sheets.service';
export declare class GoogleSheetsController {
    private readonly googleSheetsService;
    constructor(googleSheetsService: GoogleSheetsService);
    getData(): Record<string, string>[];
    reload(): Promise<{
        message: string;
        rows: number;
        characters: number;
    }>;
}
