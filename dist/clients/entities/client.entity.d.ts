import { Chat } from '../../chats/entities/chat.entity';
import { Appointment } from '../../google-calendar/entities/appointment.entity';
export declare class Client {
    id: number;
    userId: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    documentId: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    postalCode: string | null;
    notes: string | null;
    chats: Chat[];
    appointments: Appointment[];
    createdAt: Date;
    updatedAt: Date;
}
