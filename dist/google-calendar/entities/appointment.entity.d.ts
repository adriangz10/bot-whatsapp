import { Client } from '../../clients/entities/client.entity';
export declare enum AppointmentStatus {
    SCHEDULED = "scheduled",
    CANCELLED = "cancelled"
}
export declare class Appointment {
    id: number;
    googleEventId: string;
    userId: string | null;
    chatId: number | null;
    clientId: number | null;
    client: Client | null;
    contactName: string | null;
    summary: string;
    description: string | null;
    location: string | null;
    startDateTime: Date;
    endDateTime: Date;
    status: AppointmentStatus;
    reminder1hSentAt: Date | null;
    reminder20mSentAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
