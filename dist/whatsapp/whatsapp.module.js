"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppModule = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("./whatsapp.service");
const whatsapp_controller_1 = require("./whatsapp.controller");
const gemini_module_1 = require("../gemini/gemini.module");
const chats_module_1 = require("../chats/chats.module");
const google_sheets_module_1 = require("../google-sheets/google-sheets.module");
const conversation_module_1 = require("../conversation/conversation.module");
let WhatsAppModule = class WhatsAppModule {
};
exports.WhatsAppModule = WhatsAppModule;
exports.WhatsAppModule = WhatsAppModule = __decorate([
    (0, common_1.Module)({
        imports: [gemini_module_1.GeminiModule, chats_module_1.ChatsModule, google_sheets_module_1.GoogleSheetsModule, conversation_module_1.ConversationModule],
        controllers: [whatsapp_controller_1.WhatsAppController],
        providers: [whatsapp_service_1.WhatsAppService],
        exports: [whatsapp_service_1.WhatsAppService],
    })
], WhatsAppModule);
//# sourceMappingURL=whatsapp.module.js.map