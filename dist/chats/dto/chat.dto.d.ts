import { ChatStatus, ChatPriority } from '../entities/chat.entity';
export declare class UpdateChatDto {
    userName?: string;
    profilePictureUrl?: string;
    status?: ChatStatus;
    priority?: ChatPriority;
    tags?: string[];
    notes?: string;
}
export declare class CreateChatDto {
    userId: string;
    userName?: string;
}
