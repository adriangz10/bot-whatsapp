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
var GoogleDocsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDocsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const rag_service_1 = require("../rag/rag.service");
let GoogleDocsService = GoogleDocsService_1 = class GoogleDocsService {
    configService;
    ragService;
    logger = new common_1.Logger(GoogleDocsService_1.name);
    documentContent = '';
    documentId;
    docsClient = null;
    constructor(configService, ragService) {
        this.configService = configService;
        this.ragService = ragService;
        this.documentId = this.configService.get('GOOGLE_DOCS_DOCUMENT_ID') || '';
    }
    async onModuleInit() {
        await this.initializeClient();
        if (this.docsClient) {
            await this.loadDocument();
        }
    }
    async initializeClient() {
        if (!this.documentId) {
            this.logger.warn('GOOGLE_DOCS_DOCUMENT_ID not configured. Context will be empty.');
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
                scopes: ['https://www.googleapis.com/auth/documents.readonly'],
            });
            this.docsClient = google.docs({ version: 'v1', auth });
        }
        catch (error) {
            this.logger.error('Failed to initialize Google Docs client:', error);
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
    async loadDocument() {
        if (!this.docsClient || !this.documentId) {
            return;
        }
        try {
            const response = await this.docsClient.documents.get({ documentId: this.documentId });
            this.documentContent = this.extractText(response.data);
            this.logger.log(`Document loaded: ${this.documentContent.length} characters`);
            await this.ragService.indexDocument(this.documentContent, 'google-docs');
        }
        catch (error) {
            this.logger.error('Failed to load Google Doc:', error?.message || error);
        }
    }
    extractText(document) {
        const content = document.body?.content || [];
        let text = '';
        for (const element of content) {
            if (element.paragraph) {
                for (const textElement of element.paragraph.elements || []) {
                    if (textElement.textRun?.content) {
                        text += textElement.textRun.content;
                    }
                }
                text += '\n';
            }
        }
        return text.trim();
    }
    getContext() {
        return this.documentContent;
    }
    async reload() {
        await this.loadDocument();
    }
};
exports.GoogleDocsService = GoogleDocsService;
exports.GoogleDocsService = GoogleDocsService = GoogleDocsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        rag_service_1.RagService])
], GoogleDocsService);
//# sourceMappingURL=google-docs.service.js.map