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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const client_entity_1 = require("./entities/client.entity");
const chat_entity_1 = require("../chats/entities/chat.entity");
const appointment_entity_1 = require("../google-calendar/entities/appointment.entity");
let ClientsService = class ClientsService {
    clientRepository;
    chatRepository;
    appointmentRepository;
    constructor(clientRepository, chatRepository, appointmentRepository) {
        this.clientRepository = clientRepository;
        this.chatRepository = chatRepository;
        this.appointmentRepository = appointmentRepository;
    }
    async findAll() {
        return this.clientRepository.find({
            order: { updatedAt: 'DESC' },
        });
    }
    async findOne(id) {
        const client = await this.clientRepository.findOne({
            where: { id },
            relations: {
                chats: true,
                appointments: true,
            },
        });
        if (!client) {
            throw new common_1.NotFoundException(`Client ${id} not found`);
        }
        return client;
    }
    async findByUserId(userId) {
        return this.clientRepository.findOne({
            where: { userId },
        });
    }
    async create(createClientDto) {
        const client = this.clientRepository.create(this.normalizeClientPayload(createClientDto));
        const savedClient = await this.clientRepository.save(client);
        await this.syncRelations(savedClient);
        return this.findOne(savedClient.id);
    }
    async update(id, updateClientDto) {
        const existing = await this.clientRepository.findOne({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException(`Client ${id} not found`);
        }
        const merged = this.clientRepository.merge(existing, this.normalizeClientPayload(updateClientDto));
        const savedClient = await this.clientRepository.save(merged);
        await this.syncRelations(savedClient);
        return this.findOne(savedClient.id);
    }
    async upsertByUserId(userId, payload = {}) {
        const existing = await this.findByUserId(userId);
        const normalizedPayload = this.normalizeClientPayload({
            ...payload,
            userId,
        });
        if (!existing) {
            const created = this.clientRepository.create(normalizedPayload);
            const saved = await this.clientRepository.save(created);
            await this.syncRelations(saved);
            return this.findOne(saved.id);
        }
        const merged = this.clientRepository.merge(existing, {
            ...normalizedPayload,
            firstName: normalizedPayload.firstName ?? existing.firstName,
            lastName: normalizedPayload.lastName ?? existing.lastName,
            fullName: normalizedPayload.fullName ?? existing.fullName,
            email: normalizedPayload.email ?? existing.email,
            phone: normalizedPayload.phone ?? existing.phone,
            documentId: normalizedPayload.documentId ?? existing.documentId,
            address: normalizedPayload.address ?? existing.address,
            city: normalizedPayload.city ?? existing.city,
            province: normalizedPayload.province ?? existing.province,
            country: normalizedPayload.country ?? existing.country,
            postalCode: normalizedPayload.postalCode ?? existing.postalCode,
            notes: normalizedPayload.notes ?? existing.notes,
        });
        const saved = await this.clientRepository.save(merged);
        await this.syncRelations(saved);
        return this.findOne(saved.id);
    }
    async delete(id) {
        await this.chatRepository
            .createQueryBuilder()
            .update(chat_entity_1.Chat)
            .set({ clientId: null })
            .where('clientId = :id', { id })
            .execute();
        await this.appointmentRepository
            .createQueryBuilder()
            .update(appointment_entity_1.Appointment)
            .set({ clientId: null })
            .where('clientId = :id', { id })
            .execute();
        await this.clientRepository.delete(id);
    }
    async syncRelations(client) {
        if (!client.userId) {
            return;
        }
        await this.chatRepository
            .createQueryBuilder()
            .update(chat_entity_1.Chat)
            .set({ clientId: client.id })
            .where('userId = :userId', { userId: client.userId })
            .execute();
        await this.appointmentRepository
            .createQueryBuilder()
            .update(appointment_entity_1.Appointment)
            .set({ clientId: client.id })
            .where('userId = :userId', { userId: client.userId })
            .execute();
    }
    normalizeClientPayload(payload) {
        const normalized = {
            userId: this.normalizeString(payload.userId),
            firstName: this.normalizeString(payload.firstName),
            lastName: this.normalizeString(payload.lastName),
            fullName: this.normalizeString(payload.fullName),
            email: this.normalizeString(payload.email),
            phone: this.normalizeString(payload.phone),
            documentId: this.normalizeString(payload.documentId),
            address: this.normalizeString(payload.address),
            city: this.normalizeString(payload.city),
            province: this.normalizeString(payload.province),
            country: this.normalizeString(payload.country),
            postalCode: this.normalizeString(payload.postalCode),
            notes: this.normalizeString(payload.notes),
        };
        if (!normalized.fullName) {
            const nameParts = [normalized.firstName, normalized.lastName].filter(Boolean);
            normalized.fullName = nameParts.length > 0 ? nameParts.join(' ') : null;
        }
        if (normalized.fullName &&
            (!normalized.firstName || !normalized.lastName)) {
            const [firstName, ...rest] = normalized.fullName.split(/\s+/);
            normalized.firstName = normalized.firstName || firstName || null;
            normalized.lastName =
                normalized.lastName || (rest.length > 0 ? rest.join(' ') : null);
        }
        return normalized;
    }
    normalizeString(value) {
        if (value === undefined) {
            return undefined;
        }
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(1, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __param(2, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ClientsService);
//# sourceMappingURL=clients.service.js.map