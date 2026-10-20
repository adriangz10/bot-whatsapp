import { UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Controller, Get } from '@nestjs/common';
import { GoogleDocsService } from './google-docs.service';

@UseGuards(ApiKeyGuard)
@Controller('google-docs')
export class GoogleDocsController {
  constructor(private readonly googleDocsService: GoogleDocsService) {}

  @Get('reload')
  async reload() {
    await this.googleDocsService.reload();
    return {
      message: 'Document reloaded successfully',
      characters: this.googleDocsService.getContext().length,
    };
  }
}
