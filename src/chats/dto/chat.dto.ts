import { ChatStatus, ChatPriority } from '../entities/chat.entity';

export class UpdateChatDto {
  userName?: string;
  profilePictureUrl?: string;
  status?: ChatStatus;
  priority?: ChatPriority;
  tags?: string[];
  notes?: string;
}

export class CreateChatDto {
  userId: string;
  userName?: string;
}