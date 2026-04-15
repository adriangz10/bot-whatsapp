import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chat } from '../../chats/entities/chat.entity';
import { Appointment } from '../../google-calendar/entities/appointment.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  fullName: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  documentId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => Chat, (chat) => chat.client)
  chats: Chat[];

  @OneToMany(() => Appointment, (appointment) => appointment.client)
  appointments: Appointment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
