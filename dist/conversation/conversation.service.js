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
exports.ConversationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const message_entity_1 = require("./entities/message.entity");
const chats_service_1 = require("../chats/chats.service");
const events_service_1 = require("../events/events.service");
let ConversationService = class ConversationService {
    messageRepository;
    chatsService;
    eventsService;
    constructor(messageRepository, chatsService, eventsService) {
        this.messageRepository = messageRepository;
        this.chatsService = chatsService;
        this.eventsService = eventsService;
    }
    async getHistory(userId, limit = 50) {
        const messages = await this.messageRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return messages.reverse().map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.content }],
        }));
    }
    async saveMessage(userId, role, content, updateChat = true) {
        let chatId;
        if (updateChat) {
            const chat = await this.chatsService.upsertByUserId(userId);
            chatId = chat.id;
        }
        const message = this.messageRepository.create({
            userId,
            role,
            content,
            chatId,
        });
        const savedMessage = await this.messageRepository.save(message);
        this.eventsService.emit('new_message', savedMessage);
        if (updateChat && chatId) {
            await this.chatsService.updateLastMessage(chatId, content);
            if (role === 'user') {
                await this.chatsService.incrementUnread(chatId);
            }
        }
        return savedMessage;
    }
    async clearHistory(userId) {
        await this.messageRepository.delete({ userId });
    }
    async getAllUserIds() {
        const result = await this.messageRepository
            .createQueryBuilder('message')
            .select('DISTINCT message.userId', 'userId')
            .getRawMany();
        return result.map((r) => r.userId);
    }
};
exports.ConversationService = ConversationService;
exports.ConversationService = ConversationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => chats_service_1.ChatsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        chats_service_1.ChatsService,
        events_service_1.EventsService])
], ConversationService);
//# sourceMappingURL=conversation.service.js.map