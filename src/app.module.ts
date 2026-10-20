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
import { EventsModule } from './events/events.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    // .env.local (desarrollo, no versionado) tiene prioridad sobre .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
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
        // 'Z' = guardar fechas en UTC. Por defecto 'local' para no reinterpretar datos ya guardados.
        timezone: config.get('DB_TIMEZONE') || 'local',

        autoLoadEntities: true,
        // El esquema se gestiona con migraciones (npm run migrate).
        // Solo para desarrollo local: DB_SYNCHRONIZE=true
        synchronize:
          process.env.NODE_ENV !== 'production' &&
          config.get('DB_SYNCHRONIZE') === 'true',
      }),
    }),
    GoogleDocsModule,
    GoogleCalendarModule,
    ConversationModule,
    GeminiModule,
    OpenAIModule,
    WhatsAppModule,
    ChatsModule,
    EventsModule,
    ClientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
