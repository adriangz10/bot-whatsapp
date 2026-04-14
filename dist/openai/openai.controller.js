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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIController = void 0;
const common_1 = require("@nestjs/common");
const openai_service_1 = require("./openai.service");
let OpenAIController = class OpenAIController {
    openaiService;
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async testOpenAI(prompt) {
        const userPrompt = prompt || 'Hola, responde brevemente';
        return await this.openaiService.chat('test-user', userPrompt);
    }
    async getConversation(userId) {
        return await this.openaiService.getHistory(userId);
    }
    async clearConversation(userId) {
        await this.openaiService.clearHistory(userId);
        return { message: `Conversation cleared for ${userId}` };
    }
};
exports.OpenAIController = OpenAIController;
__decorate([
    (0, common_1.Get)('test'),
    __param(0, (0, common_1.Query)('prompt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OpenAIController.prototype, "testOpenAI", null);
__decorate([
    (0, common_1.Get)('conversation/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OpenAIController.prototype, "getConversation", null);
__decorate([
    (0, common_1.Delete)('conversation/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OpenAIController.prototype, "clearConversation", null);
exports.OpenAIController = OpenAIController = __decorate([
    (0, common_1.Controller)('openai'),
    __metadata("design:paramtypes", [openai_service_1.OpenAIService])
], OpenAIController);
//# sourceMappingURL=openai.controller.js.map