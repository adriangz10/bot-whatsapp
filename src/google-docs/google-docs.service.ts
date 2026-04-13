import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { docs_v1 } from 'googleapis/build/src/apis/docs';
import { RagService } from '../rag/rag.service';

@Injectable()
export class GoogleDocsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleDocsService.name);
  private documentContent: string = '';
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
      this.logger.log(`Document loaded: ${this.documentContent.length} characters`);

      // Indexar el documento en el sistema RAG
      await this.ragService.indexDocument(this.documentContent);
    } catch (error) {
      this.logger.error('Failed to load Google Doc:', error);
      throw error;
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

  async reload(): Promise<void> {
    await this.loadDocument();
  }
}
