import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ConversationService } from '../conversation/conversation.service';
import { RagService } from '../rag/rag.service';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationService: ConversationService,
    private readonly ragService: RagService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async chat(
    userId: string,
    userPrompt: string,
    loadHistory: boolean = true,
  ): Promise<string> {
    // Cargar historial desde la base de datos (solo si la conversación está activa)
    const history = loadHistory
      ? await this.conversationService.getHistory(userId)
      : [];

    // Obtener los 4 chunks más relevantes del documento usando RAG
    const relevantChunks = await this.ragService.search(userPrompt, 4);

    // Construir system prompt solo con los chunks relevantes
    let systemPrompt: string | undefined;
    if (relevantChunks.length > 0) {
      systemPrompt = `Eres el asistente virtual de Syntax Servicio Tecnico. Tu trabajo es responder preguntas de los clientes ÚNICAMENTE usando la información proporcionada en el contexto.

Reglas estrictas:
1. SOLO responde con información que esté en el contexto.
2. Si la pregunta no se puede responder con el contexto, di: "Lo siento, no tengo esa información. Te recomiendo contactarnos por WhatsApp al +54345232123 o por mail a contacto@syntaxsolutions.com.ar"
3. Sé amable, conciso y útil.
4. Si preguntan precios, siempre menciona el precio exacto.
5. Responde en español.

Contexto:
${relevantChunks.join('\n---\n')}`;
    }

    // Mapear historial de Gemini al formato de OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    for (const entry of history) {
      const text = entry.parts
        .map((p) => ('text' in p ? p.text : ''))
        .join('');
      if (entry.role === 'user') {
        messages.push({ role: 'user', content: text });
      } else {
        messages.push({ role: 'assistant', content: text });
      }
    }

    messages.push({ role: 'user', content: userPrompt });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content ?? '';

    // Guardar los nuevos mensajes en la base de datos
    await this.conversationService.saveMessage(userId, 'user', userPrompt);
    await this.conversationService.saveMessage(userId, 'model', response);

    return response;
  }

  async transcribe(audioBuffer: Buffer, filename: string = 'audio.ogg'): Promise<string> {
    const file = new File(
      [new Uint8Array(audioBuffer) as unknown as BlobPart],
      filename,
      { type: 'audio/ogg' },
    );

    const transcription = await this.openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'es',
    });

    return transcription.text;
  }

  async clearHistory(userId: string): Promise<void> {
    await this.conversationService.clearHistory(userId);
  }

  async getHistory(userId: string) {
    return this.conversationService.getHistory(userId);
  }
}