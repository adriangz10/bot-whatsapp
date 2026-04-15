export class RescheduleAppointmentDto {
  targetStartDateTime!: string;
  targetEndDateTime?: string;
  summary?: string;
  userId?: string;
  chatId?: number;
  clientId?: number;
  contactName?: string;
  newStartDateTime!: string;
  newEndDateTime!: string;
}
