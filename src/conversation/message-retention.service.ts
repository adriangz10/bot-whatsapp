import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

const BATCH_SIZE = 5000;
const RUN_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Borra mensajes antiguos para que la tabla no crezca sin límite.
 * Desactivado salvo que MESSAGE_RETENTION_DAYS sea un número > 0.
 */
@Injectable()
export class MessageRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageRetentionService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly retentionDays: number;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    configService: ConfigService,
  ) {
    this.retentionDays =
      Number(configService.get('MESSAGE_RETENTION_DAYS')) || 0;
  }

  onModuleInit() {
    if (this.retentionDays <= 0) {
      return;
    }

    this.timer = setInterval(() => void this.purge(), RUN_EVERY_MS);
    void this.purge();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async purge(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000,
    );
    let total = 0;

    try {
      // Por lotes para no mantener locks largos sobre la tabla
      for (;;) {
        const result = await this.messageRepository.query<{
          affectedRows?: number;
        }>('DELETE FROM messages WHERE createdAt < ? LIMIT ?', [
          cutoff,
          BATCH_SIZE,
        ]);
        const affected = result.affectedRows ?? 0;
        total += affected;
        if (affected < BATCH_SIZE) {
          break;
        }
      }

      if (total > 0) {
        this.logger.log(
          `Retention: ${total} mensajes anteriores a ${cutoff.toISOString()} eliminados`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Retention failed: ${error instanceof Error ? error.message : error}`,
      );
    }

    return total;
  }
}
