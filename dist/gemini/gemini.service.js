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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
const conversation_service_1 = require("../conversation/conversation.service");
const google_docs_service_1 = require("../google-docs/google-docs.service");
let GeminiService = class GeminiService {
    configService;
    conversationService;
    googleDocsService;
    genAI;
    constructor(configService, conversationService, googleDocsService) {
        this.configService = configService;
        this.conversationService = conversationService;
        this.googleDocsService = googleDocsService;
        const apiKey = this.configService.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY no está configurada');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async chat(userId, userPrompt) {
        const history = await this.conversationService.getHistory(userId);
        const context = this.googleDocsService.getContext();
        const model = this.genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            systemInstruction: context || undefined,
        });
        const chat = model.startChat({
            history,
        });
        const result = await chat.sendMessage(userPrompt);
        const response = result.response.text();
        await this.conversationService.saveMessage(userId, 'user', userPrompt);
        await this.conversationService.saveMessage(userId, 'model', response);
        return response;
    }
    async clearHistory(userId) {
        await this.conversationService.clearHistory(userId);
    }
    async getHistory(userId) {
        return this.conversationService.getHistory(userId);
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        conversation_service_1.ConversationService,
        google_docs_service_1.GoogleDocsService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map