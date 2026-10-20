import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ConversationService } from './conversation.service';

/** Historial de conversación por usuario, independiente del proveedor de LLM. */
@UseGuards(ApiKeyGuard)
@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get(':userId')
  async getConversation(@Param('userId') userId: string) {
    return await this.conversationService.getHistory(userId);
  }

  @Delete(':userId')
  async clearConversation(@Param('userId') userId: string) {
    await this.conversationService.clearHistory(userId);
    return { message: `Conversation cleared for ${userId}` };
  }
}
