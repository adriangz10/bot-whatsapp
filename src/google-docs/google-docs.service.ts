import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { docs_v1 } from 'googleapis/build/src/apis/docs';
import { RagService } from '../rag/rag.service';
import {
  errorMessage,
  GoogleCredentials,
  parseGoogleCredentials,
} from '../common/google-credentials';
import type { BusinessInfo } from '../conversation/assistant-prompt';

/** Hasta este tamaño se manda el documento entero al modelo; por encima se usa RAG. */
const FULL_CONTEXT_MAX_CHARS = 30_000;
const RAG_TOP_K = 6;
const DEFAULT_RELOAD_MINUTES = 5;

/** Claves reconocidas en líneas "Clave: valor" del documento (normalizadas). */
const BUSINESS_KEYS: Record<string, keyof BusinessInfo> = {
  'nombre del negocio': 'name',
  'nombre del asistente': 'assistantName',
  contacto: 'contact',
  'zona horaria': 'timeZone',
  saludo: 'greeting',
};

function normalizeKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class GoogleDocsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GoogleDocsService.name);
  private documentContent: string = '';
  private businessInfo: BusinessInfo = {};
  private timer: NodeJS.Timeout | null = null;
  private readonly documentId: string;
  private docsClient: docs_v1.Docs | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly ragService: RagService,
  ) {
    this.documentId =
      this.configService.get<string>('GOOGLE_DOCS_DOCUMENT_ID') || '';
  }

  async onModuleInit() {
    await this.initializeClient();
    if (!this.docsClient) {
      return;
    }

    await this.loadDocument();

    // Recarga periódica: los cambios del Doc se aplican sin reiniciar el bot
    const minutes =
      Number(this.configService.get('GOOGLE_DOCS_RELOAD_MINUTES')) ||
      DEFAULT_RELOAD_MINUTES;
    this.timer = setInterval(() => void this.loadDocument(), minutes * 60_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async initializeClient() {
    if (!this.documentId) {
      this.logger.warn(
        'GOOGLE_DOCS_DOCUMENT_ID not configured. Context will be empty.',
      );
      return;
    }

    const credentials = this.getCredentials();
    if (!credentials) {
      this.logger.warn(
        'Google credentials not configured. Set GOOGLE_CREDENTIALS env var.',
      );
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

  private getCredentials(): GoogleCredentials | null {
    const credentialsJson =
      this.configService.get<string>('GOOGLE_CREDENTIALS');

    if (!credentialsJson) {
      this.logger.warn('GOOGLE_CREDENTIALS not configured.');
      return null;
    }

    try {
      return parseGoogleCredentials(credentialsJson);
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
      const response = await this.docsClient.documents.get({
        documentId: this.documentId,
      });
      const text = this.extractText(response.data);
      if (text === this.documentContent) {
        return;
      }

      this.documentContent = text;
      this.businessInfo = this.parseBusinessInfo(text);
      this.logger.log(
        `Document loaded: ${text.length} characters (negocio: ${this.businessInfo.name ?? 'sin nombre'})`,
      );

      // Solo los documentos grandes se indexan en RAG; los chicos van completos al modelo
      if (text.length > FULL_CONTEXT_MAX_CHARS) {
        await this.ragService.indexDocument(text, 'google-docs');
      }
    } catch (error) {
      this.logger.error('Failed to load Google Doc:', errorMessage(error));
    }
  }

  private extractText(document: docs_v1.Schema$Document): string {
    return this.extractElements(document.body?.content || []).trim();
  }

  /** Recorre párrafos y tablas (cada fila de tabla queda como "celda | celda"). */
  private extractElements(content: docs_v1.Schema$StructuralElement[]): string {
    let text = '';

    for (const element of content) {
      if (element.paragraph) {
        for (const textElement of element.paragraph.elements || []) {
          if (textElement.textRun?.content) {
            text += textElement.textRun.content;
          }
        }
        text += '\n';
      } else if (element.table) {
        for (const row of element.table.tableRows || []) {
          const cells = (row.tableCells || []).map((cell) =>
            this.extractElements(cell.content || [])
              .replace(/\s+/g, ' ')
              .trim(),
          );
          text += cells.join(' | ') + '\n';
        }
      }
    }

    return text;
  }

  getContext(): string {
    return this.documentContent;
  }

  getBusinessInfo(): BusinessInfo {
    return this.businessInfo;
  }

  /** Contexto para el modelo: el documento entero o, si es grande, los fragmentos relevantes. */
  async getContextFor(query: string): Promise<string[]> {
    if (!this.documentContent) {
      return [];
    }
    if (this.documentContent.length <= FULL_CONTEXT_MAX_CHARS) {
      return [this.documentContent];
    }
    return this.ragService.search(query, RAG_TOP_K);
  }

  /** Lee las líneas "Clave: valor" conocidas (Nombre del negocio, Contacto, ...). */
  private parseBusinessInfo(text: string): BusinessInfo {
    const info: BusinessInfo = {};

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([^:|]{3,40}):\s*(.+?)\s*$/);
      const field = match && BUSINESS_KEYS[normalizeKey(match[1])];
      if (field && !info[field]) {
        info[field] = match[2];
      }
    }

    return info;
  }

  async reload(): Promise<void> {
    await this.loadDocument();
  }
}
