import { Chat } from '../../chats/entities/chat.entity';
export declare class Message {
    id: number;
    userId: string;
    role: 'user' | 'model';
    content: string;
    chatId: number;
    chat: Chat;
    createdAt: Date;
}
