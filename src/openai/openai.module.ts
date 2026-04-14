import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { OpenAIController } from './openai.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [ConversationModule, RagModule],
  controllers: [OpenAIController],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}