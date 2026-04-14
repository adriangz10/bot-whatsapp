import { Controller, Get, Query, Param, Delete } from '@nestjs/common';
import { OpenAIService } from './openai.service';

@Controller('openai')
export class OpenAIController {
  constructor(private readonly openaiService: OpenAIService) {}

  @Get('test')
  async testOpenAI(@Query('prompt') prompt: string): Promise<string> {
    const userPrompt = prompt || 'Hola, responde brevemente';
    return await this.openaiService.chat('test-user', userPrompt);
  }

  @Get('conversation/:userId')
  async getConversation(@Param('userId') userId: string) {
    return await this.openaiService.getHistory(userId);
  }

  @Delete('conversation/:userId')
  async clearConversation(@Param('userId') userId: string) {
    await this.openaiService.clearHistory(userId);
    return { message: `Conversation cleared for ${userId}` };
  }
}