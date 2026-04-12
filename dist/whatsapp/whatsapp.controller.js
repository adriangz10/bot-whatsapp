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
exports.WhatsAppController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const whatsapp_service_1 = require("./whatsapp.service");
const whatsapp_dto_1 = require("./whatsapp.dto");
const whatsapp_webhook_dto_1 = require("./whatsapp-webhook.dto");
const gemini_service_1 = require("../gemini/gemini.service");
const chats_service_1 = require("../chats/chats.service");
let WhatsAppController = class WhatsAppController {
    whatsappService;
    geminiService;
    configService;
    chatsService;
    constructor(whatsappService, geminiService, configService, chatsService) {
        this.whatsappService = whatsappService;
        this.geminiService = geminiService;
        this.configService = configService;
        this.chatsService = chatsService;
    }
    async sendMessage(body) {
        return await this.whatsappService.sendMessage(body.to, body.message);
    }
    verifyWebhook(mode, challenge, token) {
        const verifyToken = this.configService.get('WHATSAPP_VERIFY_TOKEN');
        if (mode === 'subscribe' && token === verifyToken) {
            return challenge;
        }
        return 'Verification failed';
    }
    async handleWebhook(body) {
        try {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const message = change?.value?.messages?.[0];
            if (!message) {
                return 'No message';
            }
            const from = message.from;
            const text = message.text?.body;
            if (!text) {
                return 'No text in message';
            }
            const contact = change?.value?.contacts?.[0];
            const contactName = contact?.profile?.name || null;
            const chat = await this.chatsService.upsertByUserId(from, contactName || undefined);
            if (chat) {
                const profilePictureUrl = await this.whatsappService.getProfilePicture(from);
                if (profilePictureUrl) {
                    await this.chatsService.update(chat.id, { profilePictureUrl });
                }
            }
            const isInactive = chat ? this.chatsService.isInactive(chat, 30) : false;
            if (isInactive) {
                await this.chatsService.reactivate(chat.id);
            }
            const timeoutMs = 30000;
            const response = await Promise.race([
                this.geminiService.chat(from, text, !isInactive),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), timeoutMs)),
            ]);
            await this.whatsappService.sendMessage(from, response);
            return 'OK';
        }
        catch (error) {
            console.error('Webhook error:', error instanceof Error ? error.message : error);
            return 'Error';
        }
    }
};
exports.WhatsAppController = WhatsAppController;
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [whatsapp_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.challenge')),
    __param(2, (0, common_1.Query)('hub.verify_token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Object)
], WhatsAppController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [whatsapp_webhook_dto_1.WhatsAppWebhookDto]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "handleWebhook", null);
exports.WhatsAppController = WhatsAppController = __decorate([
    (0, common_1.Controller)('whatsapp'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsAppService,
        gemini_service_1.GeminiService,
        config_1.ConfigService,
        chats_service_1.ChatsService])
], WhatsAppController);
//# sourceMappingURL=whatsapp.controller.js.map