import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { ConversationService } from '../conversation/conversation.service';
import { RagService } from '../rag/rag.service';

@Injectable()
export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationService: ConversationService,
    private readonly ragService: RagService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async chat(userId: string, userPrompt: string, loadHistory: boolean = true): Promise<string> {
    // Cargar historial desde la base de datos (solo si la conversación está activa)
    const history = loadHistory ? await this.conversationService.getHistory(userId) : [];

    // Obtener los 4 chunks más relevantes del documento usando RAG
    const relevantChunks = await this.ragService.search(userPrompt, 4);

    // Construir systemInstruction solo con los chunks relevantes
    let systemInstruction: string | undefined;
    if (relevantChunks.length > 0) {
      systemInstruction = `Eres el asistente virtual de Syntax Servicio Tecnico. Tu trabajo es responder preguntas de los clientes ÚNICAMENTE usando la información proporcionada en el contexto.

Reglas estrictas:
1. SOLO responde con información que esté en el contexto.
2. Si la pregunta no se puede responder con el contexto, di: "Lo siento, no tengo esa información. Te recomiendo contactarnos por WhatsApp al +54345232123 o por mail a contacto@syntaxsolutions.com.ar"
3. Sé amable, conciso y útil.
4. Si preguntan precios, siempre menciona el precio exacto.
5. Responde en español.

Contexto:
${relevantChunks.join('\n---\n')}`;
    }

    // Crear modelo con instrucciones del sistema (solo chunks relevantes)
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction,
      generationConfig: {
        temperature: 0.3,
      },
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