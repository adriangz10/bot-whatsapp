import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { GeminiModule } from '../gemini/gemini.module';
import { OpenAIModule } from '../openai/openai.module';
import { ChatsModule } from '../chats/chats.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { ConversationModule } from '../conversation/conversation.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [GeminiModule, OpenAIModule, ChatsModule, GoogleSheetsModule, ConversationModule, forwardRef(() => GoogleCalendarModule), ClientsModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
