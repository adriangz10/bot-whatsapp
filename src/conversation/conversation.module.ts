import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { MessageRetentionService } from './message-retention.service';
import { Message } from './entities/message.entity';
import { ChatsModule } from '../chats/chats.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    forwardRef(() => ChatsModule),
    EventsModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService, MessageRetentionService],
  exports: [ConversationService],
})
export class ConversationModule {}
