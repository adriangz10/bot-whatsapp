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
var GoogleCalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const appointment_entity_1 = require("./entities/appointment.entity");
let GoogleCalendarService = GoogleCalendarService_1 = class GoogleCalendarService {
    configService;
    appointmentRepository;
    logger = new common_1.Logger(GoogleCalendarService_1.name);
    calendarId;
    defaultTimeZone;
    calendarClient = null;
    constructor(configService, appointmentRepository) {
        this.configService = configService;
        this.appointmentRepository = appointmentRepository;
        this.calendarId =
            this.configService.get('GOOGLE_CALENDAR_ID') || 'primary';
        this.defaultTimeZone =
            this.configService.get('GOOGLE_CALENDAR_TIME_ZONE') ||
                'America/Argentina/Buenos_Aires';
    }
    async onModuleInit() {
        await this.initializeClient();
    }
    async initializeClient() {
        const credentials = this.getCredentials();
        if (!credentials) {
            this.logger.warn('Google Calendar disabled. Set GOOGLE_CREDENTIALS to enable scheduling.');
            return;
        }
        try {
            const { google } = await import('googleapis');
            const auth = new google.auth.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/calendar'],
            });
            this.calendarClient = google.calendar({ version: 'v3', auth });
        }
        catch (error) {
            this.logger.error('Failed to initialize Google Calendar client:', error);
        }
    }
    getCredentials() {
        const credentialsJson = this.configService.get('GOOGLE_CREDENTIALS');
        if (!credentialsJson) {
            return null;
        }
        try {
            const credentials = JSON.parse(credentialsJson);
            return {
                client_email: credentials.client_email,
                private_key: credentials.private_key.replace(/\\n/g, '\n'),
            };
        }
        catch (error) {
            this.logger.error('Failed to parse GOOGLE_CREDENTIALS:', error);
            return null;
        }
    }
    ensureClient() {
        if (!this.calendarClient) {
            throw new common_1.ServiceUnavailableException('Google Calendar is not configured');
        }
        return this.calendarClient;
    }
    parseDateTime(value, fieldName) {
        if (!value) {
            throw new common_1.BadRequestException(`${fieldName} is required`);
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new common_1.BadRequestException(`${fieldName} must be a valid ISO date`);
        }
        return date.toISOString();
    }
    mapEvent(event) {
        return {
            id: event.id,
            status: event.status,
            summary: event.summary,
            description: event.description,
            location: event.location,
            htmlLink: event.htmlLink,
            start: event.start,
            end: event.end,
            attendees: event.attendees?.map((attendee) => ({
                email: attendee.email,
                responseStatus: attendee.responseStatus,
            })),
        };
    }
    async saveAppointmentRecord(params) {
        let record = await this.appointmentRepository.findOne({
            where: { googleEventId: params.googleEventId },
        });
        if (!record) {
            record = this.appointmentRepository.create({
                googleEventId: params.googleEventId,
            });
        }
        record.userId =
            params.userId !== undefined ? params.userId : (record.userId ?? null);
        record.chatId =
            params.chatId !== undefined ? params.chatId : (record.chatId ?? null);
        record.clientId =
            params.clientId !== undefined ? params.clientId : (record.clientId ?? null);
        record.contactName =
            params.contactName !== undefined
                ? params.contactName
                : (record.contactName ?? null);
        record.summary = params.summary?.trim() || record.summary || '';
        record.description =
            params.description !== undefined
                ? params.description || null
                : (record.description ?? null);
        record.location =
            params.location !== undefined
                ? params.location || null
                : (record.location ?? null);
        record.startDateTime = new Date(params.startDateTime);
        record.endDateTime = new Date(params.endDateTime);
        record.status = params.status || appointment_entity_1.AppointmentStatus.SCHEDULED;
        if (params.resetReminders) {
            record.reminder1hSentAt = null;
            record.reminder20mSentAt = null;
        }
        record.cancelledAt =
            record.status === appointment_entity_1.AppointmentStatus.CANCELLED ? new Date() : null;
        return this.appointmentRepository.save(record);
    }
    async listAppointments(query) {
        const client = this.ensureClient();
        const timeMin = this.parseDateTime(query.timeMin, 'timeMin');
        const timeMax = this.parseDateTime(query.timeMax, 'timeMax');
        const maxResults = Number(query.maxResults || 20);
        if (new Date(timeMin) >= new Date(timeMax)) {
            throw new common_1.BadRequestException('timeMin must be before timeMax');
        }
        const response = await client.events.list({
            calendarId: this.calendarId,
            singleEvents: true,
            orderBy: 'startTime',
            timeMin,
            timeMax,
            maxResults: Number.isFinite(maxResults) ? maxResults : 20,
        });
        return {
            calendarId: this.calendarId,
            items: response.data.items?.map((event) => this.mapEvent(event)) || [],
        };
    }
    async listLocalAppointments(query) {
        const limit = Number(query.limit || 50);
        const qb = this.appointmentRepository
            .createQueryBuilder('appointment')
            .orderBy('appointment.startDateTime', 'ASC')
            .take(Number.isFinite(limit) ? limit : 50);
        if (query.userId) {
            qb.andWhere('appointment.userId = :userId', { userId: query.userId });
        }
        if (query.status) {
            qb.andWhere('appointment.status = :status', { status: query.status });
        }
        if (query.from) {
            qb.andWhere('appointment.startDateTime >= :from', {
                from: new Date(this.parseDateTime(query.from, 'from')),
            });
        }
        if (query.to) {
            qb.andWhere('appointment.startDateTime <= :to', {
                to: new Date(this.parseDateTime(query.to, 'to')),
            });
        }
        const items = await qb.getMany();
        return {
            total: items.length,
            items,
        };
    }
    async checkAvailability(startDateTime, endDateTime) {
        const appointments = await this.listAppointments({
            timeMin: startDateTime,
            timeMax: endDateTime,
            maxResults: '50',
        });
        return {
            available: appointments.items.length === 0,
            conflicts: appointments.items,
        };
    }
    async createAppointment(body) {
        const client = this.ensureClient();
        const startDateTime = this.parseDateTime(body.startDateTime, 'startDateTime');
        const endDateTime = this.parseDateTime(body.endDateTime, 'endDateTime');
        if (!body.summary?.trim()) {
            throw new common_1.BadRequestException('summary is required');
        }
        if (new Date(startDateTime) >= new Date(endDateTime)) {
            throw new common_1.BadRequestException('startDateTime must be before endDateTime');
        }
        const conflicts = await this.checkAvailability(startDateTime, endDateTime);
        if (!conflicts.available) {
            throw new common_1.BadRequestException({
                message: 'The selected time slot is not available',
                conflicts: conflicts.conflicts,
            });
        }
        const response = await client.events.insert({
            calendarId: this.calendarId,
            sendUpdates: 'all',
            requestBody: {
                summary: body.summary.trim(),
                description: body.description?.trim(),
                location: body.location?.trim(),
                start: {
                    dateTime: startDateTime,
                    timeZone: body.timeZone || this.defaultTimeZone,
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: body.timeZone || this.defaultTimeZone,
                },
                attendees: (body.attendeeEmails || [])
                    .filter((email) => !!email?.trim())
                    .map((email) => ({ email: email.trim() })),
            },
        });
        await this.saveAppointmentRecord({
            googleEventId: response.data.id,
            userId: body.userId,
            chatId: body.chatId,
            clientId: body.clientId,
            contactName: body.contactName,
            summary: response.data.summary,
            description: response.data.description,
            location: response.data.location,
            startDateTime: response.data.start?.dateTime || startDateTime,
            endDateTime: response.data.end?.dateTime || endDateTime,
            status: appointment_entity_1.AppointmentStatus.SCHEDULED,
            resetReminders: true,
        });
        return {
            message: 'Appointment created successfully',
            event: this.mapEvent(response.data),
        };
    }
    async findMatchingEvent(params) {
        const client = this.ensureClient();
        const targetStart = this.parseDateTime(params.targetStartDateTime, 'targetStartDateTime');
        if (params.userId) {
            const appointmentRecord = await this.appointmentRepository.findOne({
                where: {
                    userId: params.userId,
                    startDateTime: new Date(targetStart),
                    status: appointment_entity_1.AppointmentStatus.SCHEDULED,
                },
            });
            if (appointmentRecord) {
                const response = await client.events.get({
                    calendarId: this.calendarId,
                    eventId: appointmentRecord.googleEventId,
                });
                return response.data;
            }
        }
        const targetEnd = params.targetEndDateTime
            ? this.parseDateTime(params.targetEndDateTime, 'targetEndDateTime')
            : new Date(new Date(targetStart).getTime() + 60 * 60 * 1000).toISOString();
        const rangeStart = new Date(new Date(targetStart).getTime() - 12 * 60 * 60 * 1000).toISOString();
        const rangeEnd = new Date(new Date(targetEnd).getTime() + 12 * 60 * 60 * 1000).toISOString();
        const response = await client.events.list({
            calendarId: this.calendarId,
            singleEvents: true,
            orderBy: 'startTime',
            timeMin: rangeStart,
            timeMax: rangeEnd,
            maxResults: 20,
        });
        const summary = params.summary?.trim().toLowerCase();
        const candidates = (response.data.items || []).filter((event) => {
            const eventStart = event.start?.dateTime || event.start?.date;
            if (!eventStart) {
                return false;
            }
            const eventStartTime = new Date(eventStart).getTime();
            const targetStartTime = new Date(targetStart).getTime();
            const withinWindow = Math.abs(eventStartTime - targetStartTime) <= 2 * 60 * 60 * 1000;
            if (!withinWindow) {
                return false;
            }
            if (!summary) {
                return true;
            }
            return (event.summary || '').toLowerCase().includes(summary);
        });
        if (candidates.length === 0) {
            throw new common_1.BadRequestException('No matching appointment was found');
        }
        if (candidates.length > 1) {
            throw new common_1.BadRequestException('Multiple appointments matched the request');
        }
        return candidates[0];
    }
    async rescheduleAppointment(params) {
        const client = this.ensureClient();
        const matchingEvent = await this.findMatchingEvent(params);
        const newStartDateTime = this.parseDateTime(params.newStartDateTime, 'newStartDateTime');
        const newEndDateTime = this.parseDateTime(params.newEndDateTime, 'newEndDateTime');
        if (new Date(newStartDateTime) >= new Date(newEndDateTime)) {
            throw new common_1.BadRequestException('newStartDateTime must be before newEndDateTime');
        }
        const conflicts = await this.checkAvailability(newStartDateTime, newEndDateTime);
        const actualConflicts = conflicts.conflicts.filter((event) => event.id !== matchingEvent.id);
        if (actualConflicts.length > 0) {
            throw new common_1.BadRequestException({
                message: 'The selected time slot is not available',
                conflicts: actualConflicts,
            });
        }
        const response = await client.events.patch({
            calendarId: this.calendarId,
            eventId: matchingEvent.id,
            sendUpdates: 'all',
            requestBody: {
                start: {
                    dateTime: newStartDateTime,
                    timeZone: this.defaultTimeZone,
                },
                end: {
                    dateTime: newEndDateTime,
                    timeZone: this.defaultTimeZone,
                },
            },
        });
        await this.saveAppointmentRecord({
            googleEventId: response.data.id,
            userId: params.userId || undefined,
            chatId: params.chatId || undefined,
            clientId: params.clientId || undefined,
            contactName: params.contactName || undefined,
            summary: response.data.summary,
            description: response.data.description,
            location: response.data.location,
            startDateTime: response.data.start?.dateTime || newStartDateTime,
            endDateTime: response.data.end?.dateTime || newEndDateTime,
            status: appointment_entity_1.AppointmentStatus.SCHEDULED,
            resetReminders: true,
        });
        return {
            message: 'Appointment rescheduled successfully',
            event: this.mapEvent(response.data),
        };
    }
    async cancelAppointment(params) {
        const client = this.ensureClient();
        const matchingEvent = await this.findMatchingEvent(params);
        const fallbackEndDateTime = params.targetEndDateTime ||
            new Date(new Date(this.parseDateTime(params.targetStartDateTime, 'targetStartDateTime')).getTime() +
                60 * 60 * 1000).toISOString();
        await client.events.delete({
            calendarId: this.calendarId,
            eventId: matchingEvent.id,
            sendUpdates: 'all',
        });
        await this.saveAppointmentRecord({
            googleEventId: matchingEvent.id,
            userId: params.userId || undefined,
            summary: matchingEvent.summary,
            description: matchingEvent.description,
            location: matchingEvent.location,
            startDateTime: matchingEvent.start?.dateTime ||
                this.parseDateTime(params.targetStartDateTime, 'targetStartDateTime'),
            endDateTime: matchingEvent.end?.dateTime || fallbackEndDateTime,
            status: appointment_entity_1.AppointmentStatus.CANCELLED,
        });
        return {
            message: 'Appointment cancelled successfully',
            event: this.mapEvent(matchingEvent),
        };
    }
};
exports.GoogleCalendarService = GoogleCalendarService;
exports.GoogleCalendarService = GoogleCalendarService = GoogleCalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], GoogleCalendarService);
//# sourceMappingURL=google-calendar.service.js.map