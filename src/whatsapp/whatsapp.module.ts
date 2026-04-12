import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { GeminiModule } from '../gemini/gemini.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [GeminiModule, ChatsModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}