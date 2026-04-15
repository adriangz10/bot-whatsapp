import { GoogleCalendarService } from './google-calendar.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { CheckAvailabilityQueryDto } from './dto/check-availability-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ListLocalAppointmentsQueryDto } from './dto/list-local-appointments-query.dto';
export declare class GoogleCalendarController {
    private readonly googleCalendarService;
    constructor(googleCalendarService: GoogleCalendarService);
    listAppointments(query: ListAppointmentsQueryDto): Promise<{
        calendarId: string;
        items: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            end: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        }[];
    }>;
    listLocalAppointments(query: ListLocalAppointmentsQueryDto): Promise<{
        total: number;
        items: import("./entities/appointment.entity").Appointment[];
    }>;
    checkAvailability(query: CheckAvailabilityQueryDto): Promise<{
        available: boolean;
        conflicts: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            end: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
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
            start: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            end: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        };
    }>;
    rescheduleAppointment(body: RescheduleAppointmentDto): Promise<{
        message: string;
        event: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            end: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        };
    }>;
    cancelAppointment(body: CancelAppointmentDto): Promise<{
        message: string;
        event: {
            id: string | null | undefined;
            status: string | null | undefined;
            summary: string | null | undefined;
            description: string | null | undefined;
            location: string | null | undefined;
            htmlLink: string | null | undefined;
            start: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            end: import("googleapis").calendar_v3.Schema$EventDateTime | undefined;
            attendees: {
                email: string | null | undefined;
                responseStatus: string | null | undefined;
            }[] | undefined;
        };
    }>;
}
