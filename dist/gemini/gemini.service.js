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
const rag_service_1 = require("../rag/rag.service");
let GeminiService = class GeminiService {
    configService;
    conversationService;
    ragService;
    genAI;
    constructor(configService, conversationService, ragService) {
        this.configService = configService;
        this.conversationService = conversationService;
        this.ragService = ragService;
        const apiKey = this.configService.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY no está configurada');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async chat(userId, userPrompt, loadHistory = true) {
        const history = loadHistory ? await this.conversationService.getHistory(userId) : [];
        const relevantChunks = await this.ragService.search(userPrompt, 4);
        let systemInstruction;
        if (relevantChunks.length > 0) {
            systemInstruction = `Eres el asistente virtual de Syntax Servicio Tecnico. Tu trabajo es responder preguntas de los clientes ÚNICAMENTE usando la información proporcionada en el contexto.

Reglas estrictas:
1. SOLO responde con información que esté en el contexto.
2. Si la pregunta no se puede responder con el contexto, di: "Lo siento, no tengo esa información. Te recomiendo contactarnos por WhatsApp al +54345232123 o por mail a contacto@syntaxsolutions.com.ar"
3. Sé amable, conciso y útil.
4. Si preguntan precios, siempre menciona el precio exacto.
5. Responde en español.

Contexto:
${relevantChunks.join('\n---\n')}`;
        }
        const model = this.genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            systemInstruction,
            generationConfig: {
                temperature: 0.3,
            },
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
        rag_service_1.RagService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map