import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { GeminiModule } from '../gemini/gemini.module';
import { ChatsModule } from '../chats/chats.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [GeminiModule, ChatsModule, GoogleSheetsModule, ConversationModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}