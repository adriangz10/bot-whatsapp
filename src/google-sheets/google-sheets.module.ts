import { Module } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleSheetsController } from './google-sheets.controller';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [GoogleSheetsController],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}