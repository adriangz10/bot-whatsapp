import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ConversationService } from '../conversation/conversation.service';
import { GoogleDocsService } from '../google-docs/google-docs.service';
import {
  buildSystemPrompt,
  contentText,
} from '../conversation/assistant-prompt';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationService: ConversationService,
    private readonly googleDocsService: GoogleDocsService,
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

    // Reglas del negocio desde el Google Doc (completo, o por RAG si es grande)
    const context = await this.googleDocsService.getContextFor(userPrompt);
    const systemPrompt = buildSystemPrompt(
      context,
      this.googleDocsService.getBusinessInfo(),
    );

    // Mapear historial de Gemini al formato de OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    for (const entry of history) {
      const text = contentText(entry);
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

  async transcribe(
    audioBuffer: Buffer,
    filename: string = 'audio.ogg',
  ): Promise<string> {
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
}
