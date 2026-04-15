import { Message } from '../../conversation/entities/message.entity';
import { Client } from '../../clients/entities/client.entity';
export declare enum ChatStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    PENDING = "pending",
    RESOLVED = "resolved",
    ARCHIVED = "archived"
}
export declare enum ChatPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high"
}
export declare class Chat {
    id: number;
    userId: string;
    userName: string;
    profilePictureUrl: string;
    lastMessage: string;
    lastMessageAt: Date;
    status: ChatStatus;
    priority: ChatPriority;
    tags: string[];
    notes: string;
    clientId: number | null;
    client: Client | null;
    unreadCount: number;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}
