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
var GoogleCalendarReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarReminderService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const appointment_entity_1 = require("./entities/appointment.entity");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const conversation_service_1 = require("../conversation/conversation.service");
let GoogleCalendarReminderService = GoogleCalendarReminderService_1 = class GoogleCalendarReminderService {
    appointmentRepository;
    whatsappService;
    conversationService;
    logger = new common_1.Logger(GoogleCalendarReminderService_1.name);
    timer = null;
    processing = false;
    constructor(appointmentRepository, whatsappService, conversationService) {
        this.appointmentRepository = appointmentRepository;
        this.whatsappService = whatsappService;
        this.conversationService = conversationService;
    }
    onModuleInit() {
        this.timer = setInterval(() => {
            void this.processReminders();
        }, 60_000);
        void this.processReminders();
    }
    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async processReminders() {
        if (this.processing) {
            return;
        }
        this.processing = true;
        try {
            await this.sendReminderWindow(60, 'reminder1hSentAt');
            await this.sendReminderWindow(20, 'reminder20mSentAt');
        }
        catch (error) {
            this.logger.error(`Reminder processing failed: ${error instanceof Error ? error.message : error}`);
        }
        finally {
            this.processing = false;
        }
    }
    async sendReminderWindow(minutesBefore, reminderField) {
        const now = new Date();
        const lowerBound = new Date(now.getTime() + (minutesBefore - 1) * 60_000);
        const upperBound = new Date(now.getTime() + (minutesBefore + 1) * 60_000);
        const appointments = await this.appointmentRepository.find({
            where: {
                status: appointment_entity_1.AppointmentStatus.SCHEDULED,
                startDateTime: (0, typeorm_2.MoreThan)(lowerBound),
                endDateTime: (0, typeorm_2.MoreThan)(now),
                [reminderField]: (0, typeorm_2.IsNull)(),
            },
            order: { startDateTime: 'ASC' },
            take: 100,
        });
        for (const appointment of appointments) {
            if (!appointment.userId) {
                continue;
            }
            if (appointment.startDateTime > upperBound) {
                continue;
            }
            const startText = new Intl.DateTimeFormat('es-AR', {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: 'America/Argentina/Buenos_Aires',
            }).format(appointment.startDateTime);
            const message = [
                `Recordatorio: tu cita es en ${minutesBefore} minutos.`,
                `Titulo: ${appointment.summary}`,
                `Inicio: ${startText}`,
            ].join('\n');
            try {
                await this.whatsappService.sendMessage(appointment.userId, message);
                await this.conversationService.saveMessage(appointment.userId, 'model', message);
                appointment[reminderField] = new Date();
                await this.appointmentRepository.save(appointment);
            }
            catch (error) {
                this.logger.error(`Failed sending reminder for appointment ${appointment.id}: ${error instanceof Error ? error.message : error}`);
            }
        }
    }
};
exports.GoogleCalendarReminderService = GoogleCalendarReminderService;
exports.GoogleCalendarReminderService = GoogleCalendarReminderService = GoogleCalendarReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => whatsapp_service_1.WhatsAppService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        whatsapp_service_1.WhatsAppService,
        conversation_service_1.ConversationService])
], GoogleCalendarReminderService);
//# sourceMappingURL=google-calendar-reminder.service.js.map