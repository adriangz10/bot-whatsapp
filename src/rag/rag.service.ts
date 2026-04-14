import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  constructor(private readonly configService: ConfigService) {
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
  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
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
    const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
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
    const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
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
   * Indexa un documento: lo divide en chunks, genera embeddings y los almacena en memoria.
   * Soporta múltiples fuentes: cada llamada agrega vectores sin sobrescribir los existentes.
   */
  async indexDocument(text: string, source: string = 'default'): Promise<void> {
    if (!text || text.trim().length === 0) {
      this.logger.warn('No hay texto para indexar');
      return;
    }

    const chunks = this.chunkText(text, 500, 50);
    this.logger.log(`[${source}] Documento dividido en ${chunks.length} chunks`);

    this.logger.log(`[${source}] Generando embeddings...`);
    const embeddings = await this.embedTexts(chunks);

    const newVectors = chunks.map((chunk, index) => ({
      chunk,
      index: this.vectors.length + index,
      embedding: embeddings[index],
      source,
    }));

    this.vectors.push(...newVectors);

    this.logger.log(`[${source}] Indexación completa: ${newVectors.length} vectores agregados (total: ${this.vectors.length})`);
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