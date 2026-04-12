import { Controller, Get, Query, Param, Delete } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('test')
  async testGemini(@Query('prompt') prompt: string): Promise<string> {
    const userPrompt = prompt || 'Hola, responde brevemente';
    return await this.geminiService.chat('test-user', userPrompt);
  }

  @Get('conversation/:userId')
  async getConversation(@Param('userId') userId: string) {
    return await this.geminiService.getHistory(userId);
  }

  @Delete('conversation/:userId')
  async clearConversation(@Param('userId') userId: string) {
    await this.geminiService.clearHistory(userId);
    return { message: `Conversation cleared for ${userId}` };
  }
}