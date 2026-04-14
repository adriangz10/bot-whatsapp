"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GoogleSheetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSheetsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const rag_service_1 = require("../rag/rag.service");
let GoogleSheetsService = GoogleSheetsService_1 = class GoogleSheetsService {
    configService;
    ragService;
    logger = new common_1.Logger(GoogleSheetsService_1.name);
    sheetData = [];
    sheetText = '';
    spreadsheetId;
    sheetsClient = null;
    constructor(configService, ragService) {
        this.configService = configService;
        this.ragService = ragService;
        this.spreadsheetId = this.configService.get('GOOGLE_SHEETS_SPREADSHEET_ID') || '';
    }
    async onModuleInit() {
        await this.initializeClient();
        if (this.sheetsClient) {
            await this.loadSpreadsheet();
        }
    }
    async initializeClient() {
        if (!this.spreadsheetId) {
            this.logger.warn('GOOGLE_SHEETS_SPREADSHEET_ID not configured. Sheet data will be empty.');
            return;
        }
        const credentials = this.getCredentials();
        if (!credentials) {
            this.logger.warn('Google credentials not configured. Set GOOGLE_CREDENTIALS env var.');
            return;
        }
        try {
            const { google } = await import('googleapis');
            const auth = new google.auth.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
            this.sheetsClient = google.sheets({ version: 'v4', auth });
        }
        catch (error) {
            this.logger.error('Failed to initialize Google Sheets client:', error);
        }
    }
    getCredentials() {
        const credentialsJson = this.configService.get('GOOGLE_CREDENTIALS');
        if (!credentialsJson) {
            this.logger.warn('GOOGLE_CREDENTIALS not configured.');
            return null;
        }
        try {
            const credentials = JSON.parse(credentialsJson);
            return {
                client_email: credentials.client_email,
                private_key: credentials.private_key.replace(/\\n/g, '\n'),
            };
        }
        catch (error) {
            this.logger.error('Failed to parse GOOGLE_CREDENTIALS:', error);
            return null;
        }
    }
    async loadSpreadsheet() {
        if (!this.sheetsClient || !this.spreadsheetId) {
            return;
        }
        try {
            const metadataResponse = await this.sheetsClient.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
                includeGridData: false,
            });
            const firstSheetTitle = metadataResponse.data.sheets?.[0]?.properties?.title;
            if (!firstSheetTitle) {
                this.logger.warn('No sheets found in the spreadsheet');
                return;
            }
            const response = await this.sheetsClient.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: firstSheetTitle,
            });
            const values = response.data.values;
            if (!values || values.length < 2) {
                this.logger.warn('Sheet is empty or has only headers');
                this.sheetData = [];
                this.sheetText = '';
                return;
            }
            const headers = values[0];
            const rows = values.slice(1);
            this.sheetData = rows.map((row) => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i] ?? '';
                });
                return obj;
            });
            this.sheetText = this.formatSheetText(firstSheetTitle, headers, rows);
            this.logger.log(`Sheet loaded: ${this.sheetData.length} rows, ${this.sheetText.length} characters`);
            await this.ragService.indexDocument(this.sheetText, 'google-sheets');
        }
        catch (error) {
            this.logger.error('Failed to load Google Sheet:', error?.message || error);
        }
    }
    formatSheetText(sheetTitle, headers, rows) {
        const lines = [];
        lines.push(`Spreadsheet data (${sheetTitle}, ${rows.length} rows):`);
        for (const row of rows) {
            const parts = [];
            headers.forEach((header, i) => {
                const value = row[i] ?? '';
                if (value) {
                    parts.push(`${header}: ${value}`);
                }
            });
            if (parts.length > 0) {
                lines.push(parts.join(' | '));
            }
        }
        return lines.join('\n').trim();
    }
    findKeyword(userMessage) {
        const messageLower = userMessage.toLowerCase().trim();
        for (const row of this.sheetData) {
            const keyword = (row['Keyword'] || row['keyword'] || '').toLowerCase().trim();
            if (keyword && messageLower.includes(keyword)) {
                return {
                    answer: row['Answer'] || row['answer'] || '',
                    media: row['Media'] || row['media'] || '',
                };
            }
        }
        return null;
    }
    getData() {
        return this.sheetData;
    }
    getContext() {
        return this.sheetText;
    }
    async reload() {
        await this.loadSpreadsheet();
    }
};
exports.GoogleSheetsService = GoogleSheetsService;
exports.GoogleSheetsService = GoogleSheetsService = GoogleSheetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        rag_service_1.RagService])
], GoogleSheetsService);
//# sourceMappingURL=google-sheets.service.js.map