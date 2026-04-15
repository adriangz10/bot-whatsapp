import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { CheckAvailabilityQueryDto } from './dto/check-availability-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ListLocalAppointmentsQueryDto } from './dto/list-local-appointments-query.dto';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('appointments')
  async listAppointments(@Query() query: ListAppointmentsQueryDto) {
    return this.googleCalendarService.listAppointments(query);
  }

  @Get('local-appointments')
  async listLocalAppointments(@Query() query: ListLocalAppointmentsQueryDto) {
    return this.googleCalendarService.listLocalAppointments(query);
  }

  @Get('availability')
  async checkAvailability(@Query() query: CheckAvailabilityQueryDto) {
    return this.googleCalendarService.checkAvailability(
      query.startDateTime,
      query.endDateTime,
    );
  }

  @Post('appointments')
  async createAppointment(@Body() body: CreateAppointmentDto) {
    return this.googleCalendarService.createAppointment(body);
  }

  @Post('appointments/reschedule')
  async rescheduleAppointment(@Body() body: RescheduleAppointmentDto) {
    return this.googleCalendarService.rescheduleAppointment(body);
  }

  @Post('appointments/cancel')
  async cancelAppointment(@Body() body: CancelAppointmentDto) {
    return this.googleCalendarService.cancelAppointment(body);
  }
}
