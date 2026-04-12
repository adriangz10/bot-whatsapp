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
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let WhatsAppService = class WhatsAppService {
    configService;
    accessToken;
    phoneNumberId;
    apiVersion = 'v22.0';
    constructor(configService) {
        this.configService = configService;
        this.accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN') || '';
        this.phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID') || '';
        if (!this.accessToken || !this.phoneNumberId) {
            console.warn('WhatsApp credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env');
        }
    }
    getApiUrl() {
        return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    }
    async sendTemplateMessage(to, templateName, languageCode = 'en_US') {
        if (!this.accessToken || !this.phoneNumberId) {
            throw new Error('WhatsApp credentials not configured');
        }
        const body = {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name: templateName,
                language: {
                    code: languageCode,
                },
            },
        };
        const response = await fetch(this.getApiUrl(), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
        }
        return data;
    }
    async sendMessage(to, message) {
        if (!this.accessToken || !this.phoneNumberId) {
            throw new Error('WhatsApp credentials not configured');
        }
        const body = {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: {
                body: message,
            },
        };
        const response = await fetch(this.getApiUrl(), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
        }
        return data;
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsAppService);
//# sourceMappingURL=whatsapp.service.js.map