import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GeminiModule } from './gemini/gemini.module';
import { OpenAIModule } from './openai/openai.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ConversationModule } from './conversation/conversation.module';
import { ChatsModule } from './chats/chats.module';
import { GoogleDocsModule } from './google-docs/google-docs.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { EventsModule } from './events/events.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        charset: 'utf8mb4',

        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    GoogleDocsModule,
    GoogleSheetsModule,
    GoogleCalendarModule,
    ConversationModule,
    GeminiModule,
    OpenAIModule,
    WhatsAppModule,
    ChatsModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
