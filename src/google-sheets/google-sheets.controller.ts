import { Controller, Get } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';

@Controller('google-sheets')
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  @Get('data')
  getData() {
    return this.googleSheetsService.getData();
  }

  @Get('reload')
  async reload() {
    await this.googleSheetsService.reload();
    return {
      message: 'Spreadsheet reloaded successfully',
      rows: this.googleSheetsService.getData().length,
      characters: this.googleSheetsService.getContext().length,
    };
  }
}