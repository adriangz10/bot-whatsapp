import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { docs_v1 } from 'googleapis/build/src/apis/docs';
import { RagService } from '../rag/rag.service';

interface ParsedPriceEntry {
  service: string;
  normalizedService: string;
  prices: string[];
  labels: string[];
}

@Injectable()
export class GoogleDocsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleDocsService.name);
  private documentContent: string = '';
  private priceEntries: ParsedPriceEntry[] = [];
  private readonly documentId: string;
  private docsClient: docs_v1.Docs | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly ragService: RagService,
  ) {
    this.documentId = this.configService.get<string>('GOOGLE_DOCS_DOCUMENT_ID') || '';
  }

  async onModuleInit() {
    await this.initializeClient();
    if (this.docsClient) {
      await this.loadDocument();
    }
  }

  private async initializeClient() {
    if (!this.documentId) {
      this.logger.warn('GOOGLE_DOCS_DOCUMENT_ID not configured. Context will be empty.');
      return;
    }

    const credentials = this.getCredentials();
    if (!credentials) {
      this.logger.warn('Google credentials not configured. Set GOOGLE_CREDENTIALS env var.');
      return;
    }

    try {
      const { google } = await import('googleapis');
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/documents.readonly'],
      });

      this.docsClient = google.docs({ version: 'v1', auth });
    } catch (error) {
      this.logger.error('Failed to initialize Google Docs client:', error);
    }
  }

  private getCredentials(): { client_email: string; private_key: string } | null {
    const credentialsJson = this.configService.get<string>('GOOGLE_CREDENTIALS');

    if (!credentialsJson) {
      this.logger.warn('GOOGLE_CREDENTIALS not configured.');
      return null;
    }

    try {
      const credentials = JSON.parse(credentialsJson);
      return {
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, '\n'),
      };
    } catch (error) {
      this.logger.error('Failed to parse GOOGLE_CREDENTIALS:', error);
      return null;
    }
  }

  private async loadDocument() {
    if (!this.docsClient || !this.documentId) {
      return;
    }

    try {
      const response = await this.docsClient.documents.get({ documentId: this.documentId });
      this.documentContent = this.extractText(response.data);
      this.priceEntries = this.parsePriceEntries(this.documentContent);
      this.logger.log(`Document loaded: ${this.documentContent.length} characters`);
      this.logger.log(`Parsed ${this.priceEntries.length} price entries from Google Doc`);

      // Indexar el documento en el sistema RAG
      await this.ragService.indexDocument(this.documentContent, 'google-docs');
    } catch (error) {
      this.logger.error('Failed to load Google Doc:', error?.message || error);
    }
  }

  private extractText(document: any): string {
    const content = document.body?.content || [];
    let text = '';

    for (const element of content) {
      if (element.paragraph) {
        for (const textElement of element.paragraph.elements || []) {
          if (textElement.textRun?.content) {
            text += textElement.textRun.content;
          }
        }
        text += '\n';
      }
    }

    return text.trim();
  }

  getContext(): string {
    return this.documentContent;
  }

  findPriceAnswer(userMessage: string): string | null {
    const normalizedMessage = this.normalizeText(userMessage);
    if (!this.looksLikePriceQuestion(normalizedMessage)) {
      return null;
    }

    const bestMatch = this.findBestPriceMatch(normalizedMessage);
    if (!bestMatch) {
      return null;
    }

    const scope = this.detectEquipmentScope(normalizedMessage);
    if (scope === 'single' && bestMatch.prices.length >= 2) {
      const singlePrice = this.detectSinglePrice(normalizedMessage, bestMatch);
      if (singlePrice) {
        return `El precio de ${bestMatch.service} es ${singlePrice}.`;
      }
    }

    if (bestMatch.prices.length === 1) {
      return `El precio de ${bestMatch.service} es ${bestMatch.prices[0]}.`;
    }

    if (bestMatch.prices.length >= 2) {
      const labeledPrices = this.formatLabeledPrices(bestMatch);
      return `El precio de ${bestMatch.service} es ${labeledPrices}.`;
    }

    return null;
  }

  async reload(): Promise<void> {
    await this.loadDocument();
  }

  private parsePriceEntries(text: string): ParsedPriceEntry[] {
    const entries: ParsedPriceEntry[] = [];
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const prices = line.match(/\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g);
      if (!prices || prices.length === 0) {
        continue;
      }

      const service = line.replace(/\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (!service) {
        continue;
      }

      entries.push({
        service,
        normalizedService: this.normalizeText(service),
        prices: prices.map((price) => price.replace(/\s+/g, ' ').trim()),
        labels: this.inferPriceLabels(line, prices.length),
      });
    }

    return entries;
  }

  private normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private looksLikePriceQuestion(normalizedMessage: string): boolean {
    const triggers = [
      'precio',
      'precios',
      'cuanto sale',
      'cuanto cuesta',
      'cuesta',
      'sale',
      'valor',
      'cotizacion',
      'presupuesto',
    ];

    return triggers.some((trigger) => normalizedMessage.includes(trigger));
  }

  private findBestPriceMatch(normalizedMessage: string): ParsedPriceEntry | null {
    let bestMatch: ParsedPriceEntry | null = null;
    let bestScore = 0;

    for (const entry of this.priceEntries) {
      const score = this.scorePriceEntry(normalizedMessage, entry.normalizedService);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    return bestScore >= 2 ? bestMatch : null;
  }

  private scorePriceEntry(normalizedMessage: string, normalizedService: string): number {
    const messageTokens = new Set(normalizedMessage.split(' ').filter((token) => token.length > 2));
    const serviceTokens = normalizedService.split(' ').filter((token) => token.length > 2);
    let score = 0;

    for (const token of serviceTokens) {
      if (messageTokens.has(token)) {
        score += 1;
      }
    }

    const synonyms: Array<{ terms: string[]; bonus: number }> = [
      { terms: ['mantenimiento general', 'limpieza interna', 'pasta termica'], bonus: 3 },
      { terms: ['formateo', 'instalacion windows'], bonus: 2 },
      { terms: ['backup', 'respaldo'], bonus: 2 },
      { terms: ['virus', 'optimizacion'], bonus: 2 },
      { terms: ['clonado', 'clonar disco'], bonus: 2 },
      { terms: ['hardware', 'ram', 'ssd'], bonus: 2 },
      { terms: ['diagnostico', 'revision'], bonus: 2 },
      { terms: ['domicilio'], bonus: 2 },
      { terms: ['remoto'], bonus: 2 },
    ];

    for (const synonym of synonyms) {
      const messageHasSynonym = synonym.terms.some((term) => normalizedMessage.includes(term));
      const serviceHasSynonym = synonym.terms.some((term) => normalizedService.includes(term));

      if (messageHasSynonym && serviceHasSynonym) {
        score += synonym.bonus;
      }
    }

    return score;
  }

  private detectEquipmentScope(normalizedMessage: string): 'single' | 'both' {
    if (
      normalizedMessage.includes('notebook') ||
      normalizedMessage.includes('laptop') ||
      normalizedMessage.includes('portatil')
    ) {
      return 'single';
    }

    if (
      normalizedMessage.includes('pc') ||
      normalizedMessage.includes('computadora') ||
      normalizedMessage.includes('escritorio')
    ) {
      return 'single';
    }

    return 'both';
  }

  private detectSinglePrice(normalizedMessage: string, entry: ParsedPriceEntry): string | null {
    if (entry.prices.length === 0) {
      return null;
    }

    if (
      normalizedMessage.includes('notebook') ||
      normalizedMessage.includes('laptop') ||
      normalizedMessage.includes('portatil')
    ) {
      return this.getPriceByPreferredLabels(entry, ['notebook', 'laptop', 'portatil']) || entry.prices[1] || entry.prices[0];
    }

    if (
      normalizedMessage.includes('pc') ||
      normalizedMessage.includes('computadora') ||
      normalizedMessage.includes('escritorio')
    ) {
      return this.getPriceByPreferredLabels(entry, ['pc', 'computadora', 'escritorio']) || entry.prices[0];
    }

    return null;
  }

  private inferPriceLabels(line: string, priceCount: number): string[] {
    const explicitLabels: string[] = [];
    const fragments = line
      .split('|')
      .map((fragment) => fragment.trim())
      .filter(Boolean);

    for (const fragment of fragments) {
      if (!fragment.includes('$')) {
        continue;
      }

      const normalizedFragment = this.normalizeText(fragment);

      if (normalizedFragment.includes('notebook') || normalizedFragment.includes('laptop') || normalizedFragment.includes('portatil')) {
        explicitLabels.push('notebook');
        continue;
      }

      if (normalizedFragment.includes('pc') || normalizedFragment.includes('computadora') || normalizedFragment.includes('escritorio')) {
        explicitLabels.push('pc');
        continue;
      }

      explicitLabels.push(`precio ${explicitLabels.length + 1}`);
    }

    if (explicitLabels.length === priceCount) {
      return explicitLabels;
    }

    if (priceCount === 2) {
      return ['pc', 'notebook'];
    }

    return Array.from({ length: priceCount }, (_, index) => `precio ${index + 1}`);
  }

  private getPriceByPreferredLabels(entry: ParsedPriceEntry, preferredLabels: string[]): string | null {
    const labelIndex = entry.labels.findIndex((label) =>
      preferredLabels.some((preferredLabel) => label.includes(preferredLabel)),
    );

    if (labelIndex === -1) {
      return null;
    }

    return entry.prices[labelIndex] || null;
  }

  private formatLabeledPrices(entry: ParsedPriceEntry): string {
    return entry.prices
      .map((price, index) => `${price} para ${this.humanizePriceLabel(entry.labels[index] || `precio ${index + 1}`)}`)
      .join(' y ');
  }

  private humanizePriceLabel(label: string): string {
    if (label === 'pc') {
      return 'PC de escritorio';
    }

    if (label === 'notebook') {
      return 'notebook';
    }

    return label;
  }
}
