import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ProcessedMessage } from './entities/processed-message.entity';

const RETENTION_MS = 24 * 60 * 60 * 1000;
const CLEANUP_EVERY_MS = 60 * 60 * 1000;

/**
 * Deduplicación de mensajes de Meta (que reintenta entregas) respaldada por la BD,
 * de modo que funcione tras reinicios y con varias réplicas.
 */
@Injectable()
export class ProcessedMessageService {
  private lastCleanup = 0;

  constructor(
    @InjectRepository(ProcessedMessage)
    private readonly repository: Repository<ProcessedMessage>,
  ) {}

  /** Devuelve true si este proceso reclamó el mensaje; false si ya estaba procesado. */
  async claim(messageId: string): Promise<boolean> {
    void this.cleanup();

    try {
      await this.repository.insert({ messageId });
      return true;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'ER_DUP_ENTRY') {
        return false;
      }
      throw error;
    }
  }

  /** Libera el reclamo para que un reintento de Meta pueda volver a procesarlo. */
  async release(messageId: string): Promise<void> {
    await this.repository.delete({ messageId });
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCleanup < CLEANUP_EVERY_MS) {
      return;
    }
    this.lastCleanup = now;

    try {
      await this.repository.delete({
        createdAt: LessThan(new Date(now - RETENTION_MS)),
      });
    } catch {
      // La limpieza es best-effort
    }
  }
}
