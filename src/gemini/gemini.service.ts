import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { ConversationService } from '../conversation/conversation.service';
import { GoogleDocsService } from '../google-docs/google-docs.service';

@Injectable()
export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationService: ConversationService,
    private readonly googleDocsService: GoogleDocsService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async chat(userId: string, userPrompt: string): Promise<string> {
    // Cargar historial desde la base de datos
    const history = await this.conversationService.getHistory(userId);

    // Obtener contexto del documento de Google Docs
    const context = this.googleDocsService.getContext();

    // Crear modelo con instrucciones del sistema (contexto del documento)
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: context || undefined,
    });

    const chat = model.startChat({
      history,
    });

    const result = await chat.sendMessage(userPrompt);
    const response = result.response.text();

    // Guardar los nuevos mensajes en la base de datos
    await this.conversationService.saveMessage(userId, 'user', userPrompt);
    await this.conversationService.saveMessage(userId, 'model', response);

    return response;
  }

  async clearHistory(userId: string): Promise<void> {
    await this.conversationService.clearHistory(userId);
  }

  async getHistory(userId: string): Promise<Content[]> {
    return this.conversationService.getHistory(userId);
  }
}