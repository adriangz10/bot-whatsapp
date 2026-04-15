export declare class CreateAppointmentDto {
    summary: string;
    startDateTime: string;
    endDateTime: string;
    description?: string;
    location?: string;
    attendeeEmails?: string[];
    timeZone?: string;
    userId?: string;
    chatId?: number;
    contactName?: string;
}
