import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { Appointment } from './entities/appointment.entity';
import { GoogleCalendarReminderService } from './google-calendar-reminder.service';
import { ConversationModule } from '../conversation/conversation.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    ConversationModule,
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService, GoogleCalendarReminderService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
