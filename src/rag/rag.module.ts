import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagService } from './rag.service';
import { RagChunk } from './entities/rag-chunk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RagChunk])],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
