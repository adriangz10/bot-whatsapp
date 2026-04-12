import { Controller, Get } from '@nestjs/common';
import { GoogleDocsService } from './google-docs.service';

@Controller('google-docs')
export class GoogleDocsController {
  constructor(private readonly googleDocsService: GoogleDocsService) {}

  @Get('reload')
  async reload() {
    await this.googleDocsService.reload();
    return { message: 'Document reloaded successfully', characters: this.googleDocsService.getContext().length };
  }
}