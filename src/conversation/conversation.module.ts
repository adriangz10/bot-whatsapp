import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { Message } from './entities/message.entity';
import { ChatsModule } from '../chats/chats.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    forwardRef(() => ChatsModule),
    EventsModule,
  ],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}