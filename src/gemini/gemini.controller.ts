import { UseGuards } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Controller, Get, Query, Param, Delete } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@UseGuards(ApiKeyGuard)
@Controller('gemini')
export class GeminiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly conversationService: ConversationService,
  ) {}

  @Get('test')
  async testGemini(@Query('prompt') prompt: string): Promise<string> {
    const userPrompt = prompt || 'Hola, responde brevemente';
    return await this.geminiService.chat('test-user', userPrompt);
  }

  // @deprecated: usar GET /conversation/:userId
  @Get('conversation/:userId')
  async getConversation(@Param('userId') userId: string) {
    return await this.conversationService.getHistory(userId);
  }

  // @deprecated: usar DELETE /conversation/:userId
  @Delete('conversation/:userId')
  async clearConversation(@Param('userId') userId: string) {
    await this.conversationService.clearHistory(userId);
    return { message: `Conversation cleared for ${userId}` };
  }
}
