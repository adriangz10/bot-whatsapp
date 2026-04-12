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
exports.ChatsController = void 0;
const common_1 = require("@nestjs/common");
const chats_service_1 = require("./chats.service");
const chat_dto_1 = require("./dto/chat.dto");
const chat_entity_1 = require("./entities/chat.entity");
let ChatsController = class ChatsController {
    chatsService;
    constructor(chatsService) {
        this.chatsService = chatsService;
    }
    async findAll(page = '1', limit = '20', sortBy = 'updatedAt', sortOrder = 'DESC', status, priority, search, tags) {
        const pagination = {
            page: parseInt(page, 10) || 1,
            limit: Math.min(parseInt(limit, 10) || 20, 100),
            sortBy,
            sortOrder,
        };
        const filters = {
            status,
            priority,
            search,
            tags: tags ? tags.split(',') : undefined,
        };
        return this.chatsService.findAll(filters, pagination);
    }
    async getStats() {
        return this.chatsService.getStats();
    }
    async findOne(id) {
        return this.chatsService.findOne(id);
    }
    async getChatWithMessages(id) {
        return this.chatsService.getChatWithMessages(id);
    }
    async create(createChatDto) {
        return this.chatsService.create(createChatDto);
    }
    async update(id, updateChatDto) {
        return this.chatsService.update(id, updateChatDto);
    }
    async markAsRead(id) {
        await this.chatsService.markAsRead(id);
        return { message: 'Chat marked as read' };
    }
    async updateStatus(id, status) {
        return this.chatsService.update(id, { status });
    }
    async updatePriority(id, priority) {
        return this.chatsService.update(id, { priority });
    }
    async updateTags(id, tags) {
        return this.chatsService.update(id, { tags });
    }
    async updateNotes(id, notes) {
        return this.chatsService.update(id, { notes });
    }
    async delete(id) {
        await this.chatsService.delete(id);
        return { message: 'Chat deleted' };
    }
};
exports.ChatsController = ChatsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('sortBy')),
    __param(3, (0, common_1.Query)('sortOrder')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('priority')),
    __param(6, (0, common_1.Query)('search')),
    __param(7, (0, common_1.Query)('tags')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getChatWithMessages", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.CreateChatDto]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, chat_dto_1.UpdateChatDto]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/read'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Put)(':id/priority'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('priority')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "updatePriority", null);
__decorate([
    (0, common_1.Put)(':id/tags'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('tags')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Array]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "updateTags", null);
__decorate([
    (0, common_1.Put)(':id/notes'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('notes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "updateNotes", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "delete", null);
exports.ChatsController = ChatsController = __decorate([
    (0, common_1.Controller)('chats'),
    __metadata("design:paramtypes", [chats_service_1.ChatsService])
], ChatsController);
//# sourceMappingURL=chats.controller.js.map