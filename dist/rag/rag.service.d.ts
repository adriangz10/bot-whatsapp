import { ConfigService } from '@nestjs/config';
export declare class RagService {
    private readonly configService;
    private readonly logger;
    private readonly genAI;
    private vectors;
    constructor(configService: ConfigService);
    chunkText(text: string, chunkSize?: number, overlap?: number): string[];
    private embedTexts;
    private embedQuery;
    private cosineSimilarity;
    indexDocument(text: string): Promise<void>;
    search(query: string, topK?: number): Promise<string[]>;
    getVectorCount(): number;
}
