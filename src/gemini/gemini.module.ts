import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { GoogleDocsModule } from '../google-docs/google-docs.module';

@Module({
  imports: [ConversationModule, GoogleDocsModule],
  controllers: [GeminiController],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}