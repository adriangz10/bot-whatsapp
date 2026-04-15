"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const google_calendar_controller_1 = require("./google-calendar.controller");
const google_calendar_service_1 = require("./google-calendar.service");
const appointment_entity_1 = require("./entities/appointment.entity");
const google_calendar_reminder_service_1 = require("./google-calendar-reminder.service");
const conversation_module_1 = require("../conversation/conversation.module");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
let GoogleCalendarModule = class GoogleCalendarModule {
};
exports.GoogleCalendarModule = GoogleCalendarModule;
exports.GoogleCalendarModule = GoogleCalendarModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([appointment_entity_1.Appointment]),
            conversation_module_1.ConversationModule,
            (0, common_1.forwardRef)(() => whatsapp_module_1.WhatsAppModule),
        ],
        controllers: [google_calendar_controller_1.GoogleCalendarController],
        providers: [google_calendar_service_1.GoogleCalendarService, google_calendar_reminder_service_1.GoogleCalendarReminderService],
        exports: [google_calendar_service_1.GoogleCalendarService],
    })
], GoogleCalendarModule);
//# sourceMappingURL=google-calendar.module.js.map