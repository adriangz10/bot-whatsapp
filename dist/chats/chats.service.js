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
exports.ChatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_entity_1 = require("./entities/chat.entity");
const message_entity_1 = require("../conversation/entities/message.entity");
const events_service_1 = require("../events/events.service");
let ChatsService = class ChatsService {
    chatRepository;
    messageRepository;
    eventsService;
    constructor(chatRepository, messageRepository, eventsService) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.eventsService = eventsService;
    }
    async findAll(filters, pagination) {
        const query = this.chatRepository
            .createQueryBuilder('chat')
            .leftJoinAndSelect('chat.client', 'client');
        if (filters.status) {
            query.andWhere('chat.status = :status', { status: filters.status });
        }
        if (filters.priority) {
            query.andWhere('chat.priority = :priority', { priority: filters.priority });
        }
        if (filters.search) {
            query.andWhere('(chat.userId LIKE :search OR chat.userName LIKE :search OR chat.lastMessage LIKE :search)', { search: `%${filters.search}%` });
        }
        if (filters.tags && filters.tags.length > 0) {
            query.andWhere('JSON_OVERLAPS(chat.tags, :tags)', { tags: JSON.stringify(filters.tags) });
        }
        const sortField = pagination.sortBy.startsWith('chat.')
            ? pagination.sortBy
            : `chat.${pagination.sortBy}`;
        query.orderBy(sortField, pagination.sortOrder);
        const skip = (pagination.page - 1) * pagination.limit;
        query.skip(skip).take(pagination.limit);
        const [data, total] = await query.getManyAndCount();
        return {
            data,
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit),
        };
    }
    async findOne(id) {
        return this.chatRepository.findOne({
            where: { id },
            relations: {
                client: true,
            },
        });
    }
    async findByUserId(userId) {
        return this.chatRepository.findOne({
            where: { userId },
            relations: {
                client: true,
            },
        });
    }
    async create(createChatDto) {
        const chat = this.chatRepository.create({
            userId: createChatDto.userId,
            userName: createChatDto.userName,
            clientId: createChatDto.clientId ?? null,
            status: chat_entity_1.ChatStatus.ACTIVE,
            priority: chat_entity_1.ChatPriority.MEDIUM,
            unreadCount: 0,
        });
        return this.chatRepository.save(chat);
    }
    async update(id, updateChatDto) {
        await this.chatRepository.update(id, updateChatDto);
        const updated = await this.findOne(id);
        if (updated) {
            this.eventsService.emit('chat_updated', updated);
        }
        return updated;
    }
    async upsertByUserId(userId, userName) {
        let chat = await this.findByUserId(userId);
        if (!chat) {
            chat = await this.create({ userId, userName });
        }
        else if (userName && chat.userName !== userName) {
            chat = (await this.update(chat.id, { userName })) || chat;
        }
        return chat;
    }
    async updateLastMessage(chatId, message) {
        await this.chatRepository.update(chatId, {
            lastMessage: message,
            lastMessageAt: new Date(),
        });
    }
    async incrementUnread(chatId) {
        await this.chatRepository.increment({ id: chatId }, 'unreadCount', 1);
    }
    async markAsRead(chatId) {
        await this.chatRepository.update(chatId, { unreadCount: 0 });
        const updated = await this.findOne(chatId);
        if (updated) {
            this.eventsService.emit('chat_updated', updated);
        }
    }
    async getChatWithMessages(id) {
        const chat = await this.findOne(id);
        if (!chat)
            return null;
        const messages = await this.messageRepository.find({
            where: { chatId: id },
            order: { createdAt: 'ASC' },
        });
        return { ...chat, messages };
    }
    async getStats() {
        const total = await this.chatRepository.count();
        const unread = await this.chatRepository
            .createQueryBuilder('chat')
            .select('SUM(chat.unreadCount)', 'total')
            .getRawOne()
            .then((result) => Number(result?.total || 0));
        const byStatus = await this.getGroupedCount('status');
        const byPriority = await this.getGroupedCount('priority');
        return { total, byStatus, byPriority, unread };
    }
    async getGroupedCount(field) {
        const result = await this.chatRepository
            .createQueryBuilder('chat')
            .select(`chat.${field}`, field)
            .addSelect('COUNT(*)', 'count')
            .groupBy(`chat.${field}`)
            .getRawMany();
        return result.reduce((acc, item) => {
            acc[item[field]] = Number(item.count);
            return acc;
        }, {});
    }
    async delete(id) {
        await this.chatRepository.delete(id);
    }
    isInactive(chat, timeoutMinutes = 30) {
        if (!chat.lastMessageAt)
            return false;
        const elapsed = Date.now() - new Date(chat.lastMessageAt).getTime();
        return elapsed > timeoutMinutes * 60 * 1000;
    }
    async reactivate(chatId) {
        await this.chatRepository.update(chatId, { status: chat_entity_1.ChatStatus.ACTIVE });
        const updated = await this.findOne(chatId);
        if (updated) {
            this.eventsService.emit('chat_updated', updated);
        }
    }
};
exports.ChatsService = ChatsService;
exports.ChatsService = ChatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __param(1, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], ChatsService);
//# sourceMappingURL=chats.service.js.map