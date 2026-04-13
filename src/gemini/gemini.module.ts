import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [ConversationModule, RagModule],
  controllers: [GeminiController],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}