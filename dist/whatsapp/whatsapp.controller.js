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
const openai_service_1 = require("../openai/openai.service");
const chats_service_1 = require("../chats/chats.service");
const google_sheets_service_1 = require("../google-sheets/google-sheets.service");
const conversation_service_1 = require("../conversation/conversation.service");
const google_calendar_service_1 = require("../google-calendar/google-calendar.service");
const clients_service_1 = require("../clients/clients.service");
const google_docs_service_1 = require("../google-docs/google-docs.service");
const CLIENT_DATA_REQUEST_PREFIX = 'Antes de agendar necesito estos datos del cliente:';
const REQUIRED_CLIENT_FIELDS = ['firstName', 'lastName', 'email', 'address'];
let WhatsAppController = class WhatsAppController {
    whatsappService;
    geminiService;
    openaiService;
    configService;
    chatsService;
    googleSheetsService;
    conversationService;
    googleCalendarService;
    clientsService;
    googleDocsService;
    constructor(whatsappService, geminiService, openaiService, configService, chatsService, googleSheetsService, conversationService, googleCalendarService, clientsService, googleDocsService) {
        this.whatsappService = whatsappService;
        this.geminiService = geminiService;
        this.openaiService = openaiService;
        this.configService = configService;
        this.chatsService = chatsService;
        this.googleSheetsService = googleSheetsService;
        this.conversationService = conversationService;
        this.googleCalendarService = googleCalendarService;
        this.clientsService = clientsService;
        this.googleDocsService = googleDocsService;
    }
    async sendMessage(body) {
        return await this.whatsappService.sendMessage(body.to, body.message);
    }
    extractClientData(text, fallbackFullName) {
        const normalizedText = text.replace(/\s+/g, ' ').trim();
        const payload = {};
        const emailMatch = normalizedText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
        if (emailMatch) {
            payload.email = emailMatch[0];
        }
        const explicitNameMatch = normalizedText.match(/(?:nombre(?:\s+completo)?|me llamo|soy)\s*[:,-]?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){1,3})/i);
        if (explicitNameMatch) {
            payload.fullName = explicitNameMatch[1].trim();
        }
        const explicitFirstNameMatch = normalizedText.match(/nombre\s*[:,-]?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/i);
        if (explicitFirstNameMatch) {
            payload.firstName = explicitFirstNameMatch[1].trim();
        }
        const explicitLastNameMatch = normalizedText.match(/apellido\s*[:,-]?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*)/i);
        if (explicitLastNameMatch) {
            payload.lastName = explicitLastNameMatch[1].trim();
        }
        const addressMatch = normalizedText.match(/(?:direccion|domicilio|dirección)\s*[:,-]?\s*([^.!\n]+?)(?=(?:\s+(?:dni|mail|email|correo|nombre|apellido)\b)|$)/i);
        if (addressMatch) {
            payload.address = addressMatch[1].trim().replace(/[.,;]+$/, '');
        }
        const documentMatch = normalizedText.match(/(?:dni|documento)\s*[:#-]?\s*([0-9.\-]{7,15})/i);
        if (documentMatch) {
            payload.documentId = documentMatch[1].trim();
        }
        if (!payload.fullName && fallbackFullName?.trim()) {
            payload.fullName = fallbackFullName.trim();
        }
        if (payload.fullName && (!payload.firstName || !payload.lastName)) {
            const [firstName, ...rest] = payload.fullName.split(/\s+/);
            if (!payload.firstName && firstName) {
                payload.firstName = firstName;
            }
            if (!payload.lastName && rest.length > 0) {
                payload.lastName = rest.join(' ');
            }
        }
        return payload;
    }
    getMissingRequiredClientFields(client) {
        return REQUIRED_CLIENT_FIELDS.filter((field) => !client[field]?.trim());
    }
    buildMissingClientDataMessage(missingFields) {
        const labels = {
            firstName: 'nombre',
            lastName: 'apellido',
            email: 'mail',
            address: 'direccion',
        };
        return `${CLIENT_DATA_REQUEST_PREFIX} ${missingFields
            .map((field) => labels[field])
            .join(', ')}. DNI opcional.`;
    }
    formatAppointmentStart(dateTime) {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: true,
            timeZone: 'America/Argentina/Buenos_Aires',
        }).format(new Date(dateTime));
    }
    async recoverPendingAppointmentIntent(userId, currentText) {
        const history = await this.conversationService.getHistory(userId, 8);
        let previousUserMessage = null;
        for (let index = history.length - 1; index >= 0; index -= 1) {
            const entry = history[index];
            const content = entry.parts
                .map((part) => ('text' in part ? part.text : ''))
                .join('')
                .trim();
            if (entry.role === 'model' &&
                content.startsWith(CLIENT_DATA_REQUEST_PREFIX)) {
                for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
                    const previousEntry = history[cursor];
                    if (previousEntry.role !== 'user') {
                        continue;
                    }
                    previousUserMessage = previousEntry.parts
                        .map((part) => ('text' in part ? part.text : ''))
                        .join('')
                        .trim();
                    break;
                }
                break;
            }
        }
        if (!previousUserMessage) {
            return null;
        }
        const reconstructedPrompt = `${previousUserMessage}\n\nDatos del cliente:\n${currentText}`;
        const recoveredIntent = await this.geminiService.detectAppointmentIntent(userId, reconstructedPrompt, false);
        return recoveredIntent.action === 'create' ? recoveredIntent : null;
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
            const messageType = message.type;
            let text;
            if (messageType === 'audio' && message.audio) {
                try {
                    const audioBuffer = await this.whatsappService.downloadMedia(message.audio.id);
                    text = await this.openaiService.transcribe(audioBuffer);
                }
                catch (err) {
                    console.error('Error transcribing audio:', err instanceof Error ? err.message : err);
                    await this.whatsappService.sendMessage(from, 'No pude procesar el audio. Por favor, envíalo de nuevo o escríbeme tu consulta.');
                    return 'Error';
                }
            }
            else {
                text = message.text?.body;
            }
            if (!text) {
                return 'No text in message';
            }
            const contact = change?.value?.contacts?.[0];
            const contactName = contact?.profile?.name || null;
            const client = await this.clientsService.upsertByUserId(from, {
                fullName: contactName || undefined,
                phone: from,
            });
            const chat = await this.chatsService.upsertByUserId(from, contactName || undefined);
            if (client && chat.clientId !== client.id) {
                await this.chatsService.update(chat.id, { clientId: client.id });
            }
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
            let appointmentIntent = await this.geminiService.detectAppointmentIntent(from, text, !isInactive);
            if (!appointmentIntent.intentDetected) {
                const recoveredIntent = await this.recoverPendingAppointmentIntent(from, text);
                if (recoveredIntent) {
                    appointmentIntent = recoveredIntent;
                }
            }
            if (appointmentIntent.intentDetected) {
                await this.conversationService.saveMessage(from, 'user', text);
                const missingDataReply = appointmentIntent.reply ||
                    'Necesito mas datos para gestionar la cita. Indicame dia, hora y motivo.';
                try {
                    if (appointmentIntent.action === 'create' &&
                        appointmentIntent.summary &&
                        appointmentIntent.startDateTime &&
                        appointmentIntent.endDateTime) {
                        const extractedClientData = this.extractClientData(text, client.fullName);
                        const updatedClient = await this.clientsService.upsertByUserId(from, {
                            ...extractedClientData,
                            phone: from,
                        });
                        const missingClientFields = this.getMissingRequiredClientFields(updatedClient);
                        if (missingClientFields.length > 0) {
                            const missingClientDataMessage = this.buildMissingClientDataMessage(missingClientFields);
                            await this.whatsappService.sendMessage(from, missingClientDataMessage);
                            await this.conversationService.saveMessage(from, 'model', missingClientDataMessage);
                            return 'OK';
                        }
                        const createdAppointment = await this.googleCalendarService.createAppointment({
                            summary: appointmentIntent.summary,
                            description: appointmentIntent.description || undefined,
                            startDateTime: appointmentIntent.startDateTime,
                            endDateTime: appointmentIntent.endDateTime,
                            userId: from,
                            chatId: chat?.id,
                            clientId: updatedClient.id,
                            contactName: updatedClient.fullName || contactName || undefined,
                        });
                        const confirmationMessage = [
                            `Tu cita fue agendada correctamente (${updatedClient.fullName || `${updatedClient.firstName} ${updatedClient.lastName}`.trim()}).`,
                            `Titulo: ${createdAppointment.event.summary}`,
                            `Inicio: ${this.formatAppointmentStart(createdAppointment.event.start?.dateTime ||
                                appointmentIntent.startDateTime)}`,
                        ]
                            .filter(Boolean)
                            .join('\n');
                        await this.whatsappService.sendMessage(from, confirmationMessage);
                        await this.conversationService.saveMessage(from, 'model', confirmationMessage);
                        return 'OK';
                    }
                    if (appointmentIntent.action === 'reschedule' &&
                        appointmentIntent.targetStartDateTime &&
                        appointmentIntent.startDateTime &&
                        appointmentIntent.endDateTime) {
                        const updatedAppointment = await this.googleCalendarService.rescheduleAppointment({
                            targetStartDateTime: appointmentIntent.targetStartDateTime,
                            targetEndDateTime: appointmentIntent.targetEndDateTime,
                            summary: appointmentIntent.summary,
                            userId: from,
                            chatId: chat?.id,
                            clientId: client.id,
                            contactName: contactName || undefined,
                            newStartDateTime: appointmentIntent.startDateTime,
                            newEndDateTime: appointmentIntent.endDateTime,
                        });
                        const rescheduleMessage = [
                            'Tu cita fue reprogramada correctamente.',
                            `Titulo: ${updatedAppointment.event.summary}`,
                            `Nuevo inicio: ${updatedAppointment.event.start?.dateTime || appointmentIntent.startDateTime}`,
                            `Nuevo fin: ${updatedAppointment.event.end?.dateTime || appointmentIntent.endDateTime}`,
                            updatedAppointment.event.htmlLink
                                ? `Link: ${updatedAppointment.event.htmlLink}`
                                : null,
                        ]
                            .filter(Boolean)
                            .join('\n');
                        await this.whatsappService.sendMessage(from, rescheduleMessage);
                        await this.conversationService.saveMessage(from, 'model', rescheduleMessage);
                        return 'OK';
                    }
                    if (appointmentIntent.action === 'cancel' &&
                        appointmentIntent.targetStartDateTime) {
                        const cancelledAppointment = await this.googleCalendarService.cancelAppointment({
                            targetStartDateTime: appointmentIntent.targetStartDateTime,
                            targetEndDateTime: appointmentIntent.targetEndDateTime,
                            summary: appointmentIntent.summary,
                            userId: from,
                        });
                        const cancelMessage = [
                            'Tu cita fue cancelada correctamente.',
                            `Titulo: ${cancelledAppointment.event.summary}`,
                            `Inicio original: ${cancelledAppointment.event.start?.dateTime || appointmentIntent.targetStartDateTime}`,
                        ].join('\n');
                        await this.whatsappService.sendMessage(from, cancelMessage);
                        await this.conversationService.saveMessage(from, 'model', cancelMessage);
                        return 'OK';
                    }
                }
                catch (error) {
                    const appointmentError = error instanceof Error
                        ? error.message
                        : 'No se pudo procesar la cita en este momento.';
                    let fallbackMessage = 'No pude gestionar la cita automaticamente. Enviame mas detalle o contacta al equipo para revisarlo.';
                    if (appointmentError.includes('not available')) {
                        fallbackMessage =
                            'Ese horario ya no esta disponible. Enviame otro dia y horario y lo reviso.';
                    }
                    else if (appointmentError.includes('No matching appointment')) {
                        fallbackMessage =
                            'No encontre una cita que coincida con esos datos. Decime el dia y horario exactos de la cita original.';
                    }
                    else if (appointmentError.includes('Multiple appointments matched')) {
                        fallbackMessage =
                            'Encontre mas de una cita parecida. Decime el dia, horario exacto y motivo para identificarla bien.';
                    }
                    await this.whatsappService.sendMessage(from, fallbackMessage);
                    await this.conversationService.saveMessage(from, 'model', fallbackMessage);
                    return 'OK';
                }
                await this.whatsappService.sendMessage(from, missingDataReply);
                await this.conversationService.saveMessage(from, 'model', missingDataReply);
                return 'OK';
            }
            const keywordMatch = this.googleSheetsService.findKeyword(text);
            if (keywordMatch) {
                await this.conversationService.saveMessage(from, 'user', text);
                if (keywordMatch.media) {
                    await this.whatsappService.sendMediaMessage(from, keywordMatch.media, keywordMatch.answer);
                    await this.conversationService.saveMessage(from, 'model', `${keywordMatch.answer}\n[Media: ${keywordMatch.media}]`);
                }
                else {
                    await this.whatsappService.sendMessage(from, keywordMatch.answer);
                    await this.conversationService.saveMessage(from, 'model', keywordMatch.answer);
                }
                return 'OK';
            }
            const priceAnswer = this.googleDocsService.findPriceAnswer(text);
            if (priceAnswer) {
                await this.conversationService.saveMessage(from, 'user', text);
                await this.whatsappService.sendMessage(from, priceAnswer);
                await this.conversationService.saveMessage(from, 'model', priceAnswer);
                return 'OK';
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
        openai_service_1.OpenAIService,
        config_1.ConfigService,
        chats_service_1.ChatsService,
        google_sheets_service_1.GoogleSheetsService,
        conversation_service_1.ConversationService,
        google_calendar_service_1.GoogleCalendarService,
        clients_service_1.ClientsService,
        google_docs_service_1.GoogleDocsService])
], WhatsAppController);
//# sourceMappingURL=whatsapp.controller.js.map