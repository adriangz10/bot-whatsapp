import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { RagChunk } from './entities/rag-chunk.entity';

interface VectorEntry {
  chunk: string;
  index: number;
  embedding: number[];
  source: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly genAI: GoogleGenerativeAI;
  private vectors: VectorEntry[] = [];

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(RagChunk)
    private readonly chunkRepository: Repository<RagChunk>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Divide un texto en chunks de `chunkSize` caracteres con `overlap` caracteres de solapamiento.
   * No corta palabras a la mitad: retrocede hasta el espacio más cercano.
   */
  chunkText(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // No cortar en medio de una palabra (solo si no estamos al final del texto)
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) {
          end = lastSpace;
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // El siguiente chunk empieza `overlap` caracteres antes del final
      const nextStart = end - overlap;
      // Asegurar que siempre avanzamos al menos 1 caracter
      start = nextStart > start ? nextStart : end;
    }

    return chunks;
  }

  /**
   * Genera embeddings individuales para cada texto usando text-embedding-004.
   */
  private async embedTexts(texts: string[]): Promise<number[][]> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-embedding-001',
    });
    const embeddings: number[][] = [];

    for (const text of texts) {
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    }

    return embeddings;
  }

  /**
   * Genera el embedding para un texto individual (la query del usuario).
   */
  private async embedQuery(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-embedding-001',
    });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Calcula la similitud coseno entre dos vectores.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Indexa un documento: lo divide en chunks y genera embeddings.
   * Los embeddings se persisten en BD con el hash del documento: si el contenido no cambió
   * se cargan desde ahí en lugar de volver a llamar a la API de embeddings.
   * Reindexar una fuente reemplaza sus vectores anteriores (no se duplican).
   */
  async indexDocument(text: string, source: string = 'default'): Promise<void> {
    if (!text || text.trim().length === 0) {
      this.logger.warn('No hay texto para indexar');
      return;
    }

    const contentHash = createHash('sha256').update(text).digest('hex');
    const chunks = this.chunkText(text, 500, 50);
    this.logger.log(
      `[${source}] Documento dividido en ${chunks.length} chunks`,
    );

    let entries = await this.loadFromDatabase(
      source,
      contentHash,
      chunks.length,
    );

    if (entries) {
      this.logger.log(`[${source}] Embeddings cargados desde la base de datos`);
    } else {
      this.logger.log(`[${source}] Generando embeddings...`);
      const embeddings = await this.embedTexts(chunks);
      entries = chunks.map((chunk, index) => ({
        chunk,
        index,
        embedding: embeddings[index],
        source,
      }));
      await this.saveToDatabase(source, contentHash, entries);
    }

    this.vectors = [
      ...this.vectors.filter((entry) => entry.source !== source),
      ...entries,
    ];

    this.logger.log(
      `[${source}] Indexación completa: ${entries.length} vectores (total: ${this.vectors.length})`,
    );
  }

  private async loadFromDatabase(
    source: string,
    contentHash: string,
    expectedChunks: number,
  ): Promise<VectorEntry[] | null> {
    try {
      const rows = await this.chunkRepository.find({
        where: { source },
        order: { chunkIndex: 'ASC' },
      });

      if (
        rows.length !== expectedChunks ||
        rows.some((row) => row.contentHash !== contentHash)
      ) {
        return null;
      }

      return rows.map((row) => ({
        chunk: row.content,
        index: row.chunkIndex,
        embedding: row.embedding,
        source,
      }));
    } catch (error) {
      this.logger.warn(
        `No se pudo leer el caché de embeddings: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private async saveToDatabase(
    source: string,
    contentHash: string,
    entries: VectorEntry[],
  ): Promise<void> {
    try {
      await this.chunkRepository.manager.transaction(async (manager) => {
        await manager.delete(RagChunk, { source });
        await manager.insert(
          RagChunk,
          entries.map((entry) => ({
            source,
            chunkIndex: entry.index,
            content: entry.chunk,
            embedding: entry.embedding,
            contentHash,
          })),
        );
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo guardar el caché de embeddings: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Busca los `topK` chunks más relevantes para una consulta dada.
   */
  async search(query: string, topK: number = 4): Promise<string[]> {
    if (this.vectors.length === 0) {
      this.logger.warn('No hay vectores indexados. Retornando contexto vacío.');
      return [];
    }

    const queryEmbedding = await this.embedQuery(query);

    const scored = this.vectors.map((entry) => ({
      chunk: entry.chunk,
      score: this.cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    // Ordenar por similitud descendente y tomar los top K
    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, topK);

    this.logger.debug(
      `Búsqueda RAG: top ${topK} chunks seleccionados (scores: ${topResults.map((r) => r.score.toFixed(4)).join(', ')})`,
    );

    return topResults.map((r) => r.chunk);
  }

  /**
   * Retorna la cantidad de vectores indexados actualmente.
   */
  getVectorCount(): number {
    return this.vectors.length;
  }
}
