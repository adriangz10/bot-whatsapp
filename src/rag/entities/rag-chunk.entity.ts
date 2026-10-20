import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rag_chunks')
@Index('idx_rag_chunks_source', ['source'])
export class RagChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  source: string;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json' })
  embedding: number[];

  /** Hash del documento completo del que proviene el chunk; permite saltar el re-embedding si no cambió. */
  @Column({ type: 'varchar', length: 64 })
  contentHash: string;

  @Column({
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;
}
