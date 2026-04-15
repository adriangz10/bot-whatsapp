import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 255 })
  googleEventId: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  userId: string | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  chatId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 255 })
  summary: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Index()
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
