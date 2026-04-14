"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RagService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
let RagService = RagService_1 = class RagService {
    configService;
    logger = new common_1.Logger(RagService_1.name);
    genAI;
    vectors = [];
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY no está configurada');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    chunkText(text, chunkSize = 500, overlap = 50) {
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            let end = Math.min(start + chunkSize, text.length);
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
            const nextStart = end - overlap;
            start = nextStart > start ? nextStart : end;
        }
        return chunks;
    }
    async embedTexts(texts) {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
        const embeddings = [];
        for (const text of texts) {
            const result = await model.embedContent(text);
            embeddings.push(result.embedding.values);
        }
        return embeddings;
    }
    async embedQuery(text) {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
        const result = await model.embedContent(text);
        return result.embedding.values;
    }
    cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        if (denominator === 0)
            return 0;
        return dotProduct / denominator;
    }
    async indexDocument(text, source = 'default') {
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
    async search(query, topK = 4) {
        if (this.vectors.length === 0) {
            this.logger.warn('No hay vectores indexados. Retornando contexto vacío.');
            return [];
        }
        const queryEmbedding = await this.embedQuery(query);
        const scored = this.vectors.map((entry) => ({
            chunk: entry.chunk,
            score: this.cosineSimilarity(queryEmbedding, entry.embedding),
        }));
        scored.sort((a, b) => b.score - a.score);
        const topResults = scored.slice(0, topK);
        this.logger.debug(`Búsqueda RAG: top ${topK} chunks seleccionados (scores: ${topResults.map((r) => r.score.toFixed(4)).join(', ')})`);
        return topResults.map((r) => r.chunk);
    }
    getVectorCount() {
        return this.vectors.length;
    }
};
exports.RagService = RagService;
exports.RagService = RagService = RagService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RagService);
//# sourceMappingURL=rag.service.js.map