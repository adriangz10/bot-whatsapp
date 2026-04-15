import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calendar_v3 } from 'googleapis';
import { Repository } from 'typeorm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { ListLocalAppointmentsQueryDto } from './dto/list-local-appointments-query.dto';
import { Appointment } from './entities/appointment.entity';
export declare class GoogleCalendarService implements OnModuleInit {
    private readonly configService;
    private readonly appointmentRepository;
    private readonly logger;
    private readonly calendarId;
    private readonly defaultTimeZone;
    private calendarClient;
    constructor(configService: ConfigService, appointmentRepository: Repository<Appointment>);
    onModuleInit(): Promise<void>;
    private initializeClient;
    private getCredentials;
    private ensureClient;
    private parseDateTime;
    private mapEvent;
    private saveAppointmentRecord;
    listAppointments(query: ListAppointmentsQueryDto): Promise<{
        calendarId: string;
        items: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: calendar_v3.Schema$EventDateTime | undefined;
            end: calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        }[];
    }>;
    listLocalAppointments(query: ListLocalAppointmentsQueryDto): Promise<{
        total: number;
        items: Appointment[];
    }>;
    checkAvailability(startDateTime: string, endDateTime: string): Promise<{
        available: boolean;
        conflicts: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: calendar_v3.Schema$EventDateTime | undefined;
            end: calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        }[];
    }>;
    createAppointment(body: CreateAppointmentDto): Promise<{
        message: string;
        event: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: calendar_v3.Schema$EventDateTime | undefined;
            end: calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        };
    }>;
    private findMatchingEvent;
    rescheduleAppointment(params: {
        targetStartDateTime: string;
        targetEndDateTime?: string | null;
        summary?: string | null;
        userId?: string | null;
        chatId?: number | null;
        clientId?: number | null;
        contactName?: string | null;
        newStartDateTime: string;
        newEndDateTime: string;
    }): Promise<{
        message: string;
        event: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: calendar_v3.Schema$EventDateTime | undefined;
            end: calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        };
    }>;
    cancelAppointment(params: {
        targetStartDateTime: string;
        targetEndDateTime?: string | null;
        summary?: string | null;
        userId?: string | null;
    }): Promise<{
        message: string;
        event: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: calendar_v3.Schema$EventDateTime | undefined;
            end: calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        };
    }>;
}
