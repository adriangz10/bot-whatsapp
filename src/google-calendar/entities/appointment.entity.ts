import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Chat } from '../../chats/entities/chat.entity';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
}

@Entity('appointments')
@Check('chk_appointments_range', '`endDateTime` > `startDateTime`')
@Index('idx_googleEventId', ['googleEventId'], { unique: true })
@Index('idx_appointments_chatId', ['chatId'])
@Index('idx_appointments_clientId', ['clientId'])
@Index('idx_appointments_startDateTime', ['startDateTime'])
// Recordatorios: filtran por estado y rango de fechas cada 60 s
@Index('idx_appointments_status_start', ['status', 'startDateTime'])
// Búsqueda de la cita de un usuario para reprogramar/cancelar
@Index('idx_appointments_user_status_start', [
  'userId',
  'status',
  'startDateTime',
])
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  googleEventId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userId: string | null;

  @Column({ type: 'int', nullable: true })
  chatId: number | null;

  @ManyToOne(() => Chat, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'chatId',
    foreignKeyConstraintName: 'fk_appointments_chat',
  })
  chat: Chat | null;

  @Column({ type: 'int', nullable: true })
  clientId: number | null;

  @ManyToOne(() => Client, (client) => client.appointments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'clientId',
    foreignKeyConstraintName: 'fk_appointments_client',
  })
  client: Client | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 255 })
  summary: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Column({ type: 'datetime' })
  startDateTime: Date;

  @Column({ type: 'datetime' })
  endDateTime: Date;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Column({ type: 'datetime', nullable: true })
  reminder1hSentAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  reminder20mSentAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
