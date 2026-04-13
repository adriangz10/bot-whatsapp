import { Module } from '@nestjs/common';
import { GoogleDocsService } from './google-docs.service';
import { GoogleDocsController } from './google-docs.controller';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  providers: [GoogleDocsService],
  controllers: [GoogleDocsController],
  exports: [GoogleDocsService],
})
export class GoogleDocsModule {}