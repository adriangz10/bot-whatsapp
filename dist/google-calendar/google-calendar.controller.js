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
exports.GoogleCalendarController = void 0;
const common_1 = require("@nestjs/common");
const google_calendar_service_1 = require("./google-calendar.service");
const create_appointment_dto_1 = require("./dto/create-appointment.dto");
const list_appointments_query_dto_1 = require("./dto/list-appointments-query.dto");
const check_availability_query_dto_1 = require("./dto/check-availability-query.dto");
const reschedule_appointment_dto_1 = require("./dto/reschedule-appointment.dto");
const cancel_appointment_dto_1 = require("./dto/cancel-appointment.dto");
const list_local_appointments_query_dto_1 = require("./dto/list-local-appointments-query.dto");
let GoogleCalendarController = class GoogleCalendarController {
    googleCalendarService;
    constructor(googleCalendarService) {
        this.googleCalendarService = googleCalendarService;
    }
    async listAppointments(query) {
        return this.googleCalendarService.listAppointments(query);
    }
    async listLocalAppointments(query) {
        return this.googleCalendarService.listLocalAppointments(query);
    }
    async checkAvailability(query) {
        return this.googleCalendarService.checkAvailability(query.startDateTime, query.endDateTime);
    }
    async createAppointment(body) {
        return this.googleCalendarService.createAppointment(body);
    }
    async rescheduleAppointment(body) {
        return this.googleCalendarService.rescheduleAppointment(body);
    }
    async cancelAppointment(body) {
        return this.googleCalendarService.cancelAppointment(body);
    }
};
exports.GoogleCalendarController = GoogleCalendarController;
__decorate([
    (0, common_1.Get)('appointments'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_appointments_query_dto_1.ListAppointmentsQueryDto]),
    __metadata("design:returntype", Promise)
], GoogleCalendarController.prototype, "listAppointments", null);
__decorate([
    (0, common_1.Get)('local-appointments'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_local_appointments_query_dto_1.ListLocalAppointmentsQueryDto]),
    __metadata("design:returntype", Promise)
], GoogleCalendarController.prototype, "listLocalAppointments", null);
__decorate([
    (0, common_1.Get)('availability'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [check_availability_query_dto_1.CheckAvailabilityQueryDto]),
    __metadata("design:returntype", Promise)
], GoogleCalendarController.prototype, "checkAvailability", null);
__decorate([
    (0, common_1.Post)('appointments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_appointment_dto_1.CreateAppointmentDto]),
    __metadata("design:returntype", Promise)
], GoogleCalendarController.prototype, "createAppointment", null);
__decorate([
    (0, common_1.Post)('appointments/reschedule'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reschedule_appointment_dto_1.RescheduleAppointmentDto]),
    __metadata("design:returntype", Promise)
], GoogleCalendarController.prototype, "rescheduleAppointment", null);
__decorate([
    (0, common_1.Post)('appointments/cancel'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cancel_appointment_dto_1.CancelAppointmentDto]),
    __metadata("design:returntype", Promise)
], GoogleCalendarController.prototype, "cancelAppointment", null);
exports.GoogleCalendarController = GoogleCalendarController = __decorate([
    (0, common_1.Controller)('google-calendar'),
    __metadata("design:paramtypes", [google_calendar_service_1.GoogleCalendarService])
], GoogleCalendarController);
//# sourceMappingURL=google-calendar.controller.js.map