import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationService } from '../conversation/conversation.service';
export declare class GoogleCalendarReminderService implements OnModuleInit, OnModuleDestroy {
    private readonly appointmentRepository;
    private readonly whatsappService;
    private readonly conversationService;
    private readonly logger;
    private timer;
    private processing;
    constructor(appointmentRepository: Repository<Appointment>, whatsappService: WhatsAppService, conversationService: ConversationService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private processReminders;
    private sendReminderWindow;
}
