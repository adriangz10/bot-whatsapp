import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { Chat } from '../chats/entities/chat.entity';
import { Appointment } from '../google-calendar/entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Chat, Appointment])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
