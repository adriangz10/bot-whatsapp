import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { OpenAIController } from './openai.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { GoogleDocsModule } from '../google-docs/google-docs.module';

@Module({
  imports: [ConversationModule, GoogleDocsModule],
  controllers: [OpenAIController],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}
