export class CancelAppointmentDto {
  targetStartDateTime!: string;
  targetEndDateTime?: string;
  summary?: string;
  userId?: string;
}
