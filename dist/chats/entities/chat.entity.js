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
exports.Chat = exports.ChatPriority = exports.ChatStatus = void 0;
const typeorm_1 = require("typeorm");
const message_entity_1 = require("../../conversation/entities/message.entity");
var ChatStatus;
(function (ChatStatus) {
    ChatStatus["ACTIVE"] = "active";
    ChatStatus["PENDING"] = "pending";
    ChatStatus["RESOLVED"] = "resolved";
    ChatStatus["ARCHIVED"] = "archived";
})(ChatStatus || (exports.ChatStatus = ChatStatus = {}));
var ChatPriority;
(function (ChatPriority) {
    ChatPriority["LOW"] = "low";
    ChatPriority["MEDIUM"] = "medium";
    ChatPriority["HIGH"] = "high";
})(ChatPriority || (exports.ChatPriority = ChatPriority = {}));
let Chat = class Chat {
    id;
    userId;
    userName;
    lastMessage;
    lastMessageAt;
    status;
    priority;
    tags;
    notes;
    unreadCount;
    messages;
    createdAt;
    updatedAt;
};
exports.Chat = Chat;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Chat.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Chat.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "userName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "lastMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "lastMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ChatStatus,
        default: ChatStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], Chat.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ChatPriority,
        default: ChatPriority.MEDIUM,
    }),
    __metadata("design:type", String)
], Chat.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], Chat.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Chat.prototype, "unreadCount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, (message) => message.chat),
    __metadata("design:type", Array)
], Chat.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Chat.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Chat.prototype, "updatedAt", void 0);
exports.Chat = Chat = __decorate([
    (0, typeorm_1.Entity)('chats')
], Chat);
//# sourceMappingURL=chat.entity.js.map