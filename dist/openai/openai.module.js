"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIModule = void 0;
const common_1 = require("@nestjs/common");
const openai_service_1 = require("./openai.service");
const openai_controller_1 = require("./openai.controller");
const conversation_module_1 = require("../conversation/conversation.module");
const rag_module_1 = require("../rag/rag.module");
let OpenAIModule = class OpenAIModule {
};
exports.OpenAIModule = OpenAIModule;
exports.OpenAIModule = OpenAIModule = __decorate([
    (0, common_1.Module)({
        imports: [conversation_module_1.ConversationModule, rag_module_1.RagModule],
        controllers: [openai_controller_1.OpenAIController],
        providers: [openai_service_1.OpenAIService],
        exports: [openai_service_1.OpenAIService],
    })
], OpenAIModule);
//# sourceMappingURL=openai.module.js.map