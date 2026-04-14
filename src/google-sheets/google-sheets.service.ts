import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sheets_v4 } from 'googleapis/build/src/apis/sheets';
import { RagService } from '../rag/rag.service';

@Injectable()
export class GoogleSheetsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheetData: Record<string, string>[] = [];
  private sheetText: string = '';
  private readonly spreadsheetId: string;
  private sheetsClient: sheets_v4.Sheets | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly ragService: RagService,
  ) {
    this.spreadsheetId = this.configService.get<string>('GOOGLE_SHEETS_SPREADSHEET_ID') || '';
  }

  async onModuleInit() {
    await this.initializeClient();
    if (this.sheetsClient) {
      await this.loadSpreadsheet();
    }
  }

  private async initializeClient() {
    if (!this.spreadsheetId) {
      this.logger.warn('GOOGLE_SHEETS_SPREADSHEET_ID not configured. Sheet data will be empty.');
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
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheetsClient = google.sheets({ version: 'v4', auth });
    } catch (error) {
      this.logger.error('Failed to initialize Google Sheets client:', error);
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

  private async loadSpreadsheet() {
    if (!this.sheetsClient || !this.spreadsheetId) {
      return;
    }

    try {
      // Obtener metadata para el título de la primera hoja
      const metadataResponse = await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        includeGridData: false,
      });

      const firstSheetTitle = metadataResponse.data.sheets?.[0]?.properties?.title;
      if (!firstSheetTitle) {
        this.logger.warn('No sheets found in the spreadsheet');
        return;
      }

      // Obtener los valores de la primera hoja
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: firstSheetTitle,
      });

      const values = response.data.values;
      if (!values || values.length < 2) {
        this.logger.warn('Sheet is empty or has only headers');
        this.sheetData = [];
        this.sheetText = '';
        return;
      }

      const headers = values[0];
      const rows = values.slice(1);

      // Convertir filas a objetos { header: value }
      this.sheetData = rows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] ?? '';
        });
        return obj;
      });

      // Convertir a texto para RAG
      this.sheetText = this.formatSheetText(firstSheetTitle, headers, rows);
      this.logger.log(`Sheet loaded: ${this.sheetData.length} rows, ${this.sheetText.length} characters`);

      // Indexar en el sistema RAG
      await this.ragService.indexDocument(this.sheetText, 'google-sheets');
    } catch (error) {
      this.logger.error('Failed to load Google Sheet:', error?.message || error);
    }
  }

  private formatSheetText(sheetTitle: string, headers: string[], rows: string[][]): string {
    const lines: string[] = [];
    lines.push(`Spreadsheet data (${sheetTitle}, ${rows.length} rows):`);

    for (const row of rows) {
      const parts: string[] = [];
      headers.forEach((header, i) => {
        const value = row[i] ?? '';
        if (value) {
          parts.push(`${header}: ${value}`);
        }
      });
      if (parts.length > 0) {
        lines.push(parts.join(' | '));
      }
    }

    return lines.join('\n').trim();
  }

  /**
   * Busca un keyword del sheet dentro del mensaje del usuario.
   * Retorna el Answer y Media correspondientes si hay coincidencia, o null si no.
   */
  findKeyword(userMessage: string): { answer: string; media: string } | null {
    const messageLower = userMessage.toLowerCase().trim();

    for (const row of this.sheetData) {
      const keyword = (row['Keyword'] || row['keyword'] || '').toLowerCase().trim();
      if (keyword && messageLower.includes(keyword)) {
        return {
          answer: row['Answer'] || row['answer'] || '',
          media: row['Media'] || row['media'] || '',
        };
      }
    }

    return null;
  }

  getData(): Record<string, string>[] {
    return this.sheetData;
  }

  getContext(): string {
    return this.sheetText;
  }

  async reload(): Promise<void> {
    await this.loadSpreadsheet();
  }
}