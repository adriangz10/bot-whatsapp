import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('processed_messages')
export class ProcessedMessage {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  messageId: string;

  @Index('idx_processed_messages_createdAt')
  @Column({
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;
}
