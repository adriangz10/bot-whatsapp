import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
} from './entities/appointment.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationService } from '../conversation/conversation.service';

@Injectable()
export class GoogleCalendarReminderService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(GoogleCalendarReminderService.name);
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
    private readonly conversationService: ConversationService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processReminders();
    }, 60_000);

    void this.processReminders();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async processReminders() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      await this.sendReminderWindow(60, 'reminder1hSentAt');
      await this.sendReminderWindow(20, 'reminder20mSentAt');
    } catch (error) {
      this.logger.error(
        `Reminder processing failed: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      this.processing = false;
    }
  }

  private async sendReminderWindow(
    minutesBefore: number,
    reminderField: 'reminder1hSentAt' | 'reminder20mSentAt',
  ) {
    const now = new Date();
    const lowerBound = new Date(now.getTime() + (minutesBefore - 1) * 60_000);
    const upperBound = new Date(now.getTime() + (minutesBefore + 1) * 60_000);

    const appointments = await this.appointmentRepository.find({
      where: {
        status: AppointmentStatus.SCHEDULED,
        startDateTime: MoreThan(lowerBound),
        endDateTime: MoreThan(now),
        [reminderField]: IsNull(),
      },
      order: { startDateTime: 'ASC' },
      take: 100,
    });

    for (const appointment of appointments) {
      if (!appointment.userId) {
        continue;
      }

      if (appointment.startDateTime > upperBound) {
        continue;
      }

      const startText = new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(appointment.startDateTime);

      const message = [
        `Recordatorio: tu cita es en ${minutesBefore} minutos.`,
        `Titulo: ${appointment.summary}`,
        `Inicio: ${startText}`,
      ].join('\n');

      try {
        await this.whatsappService.sendMessage(appointment.userId, message);
        await this.conversationService.saveMessage(
          appointment.userId,
          'model',
          message,
        );

        appointment[reminderField] = new Date();
        await this.appointmentRepository.save(appointment);
      } catch (error) {
        this.logger.error(
          `Failed sending reminder for appointment ${appointment.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}
