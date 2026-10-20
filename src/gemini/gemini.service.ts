import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  type GenerationConfig,
} from '@google/generative-ai';
import { ConversationService } from '../conversation/conversation.service';
import { GoogleDocsService } from '../google-docs/google-docs.service';
import {
  buildSystemPrompt,
  contentText,
} from '../conversation/assistant-prompt';

export interface AppointmentIntentResult {
  action: 'create' | 'reschedule' | 'cancel' | 'none';
  intentDetected: boolean;
  summary: string | null;
  description: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  targetStartDateTime: string | null;
  targetEndDateTime: string | null;
  missingFields: string[];
  reply: string | null;
}

/** En orden de preferencia: si uno agota su cuota se usa el siguiente. */
const MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash-lite'];
const RETRIES_PER_MODEL = 2;
const DEFAULT_QUOTA_PAUSE_MS = 60 * 60 * 1000;
const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires';

interface GeminiError {
  status?: number;
  message?: string;
  errorDetails?: Array<{ '@type'?: string; retryDelay?: string }>;
}

function isTransientError(error: unknown): boolean {
  const status = (error as GeminiError)?.status;
  if (status === 429 || status === 500 || status === 503) return true;
  const message = error instanceof Error ? error.message : '';
  return /\b(429|500|503)\b|overloaded|high demand/i.test(message);
}

/** Cuota agotada (429 "quota"): reintentar no sirve hasta que se renueve. */
function quotaPauseMs(error: unknown): number | null {
  const { status, message = '', errorDetails } = (error ?? {}) as GeminiError;
  if (!(status === 429 || /\b429\b/.test(message)) || !/quota/i.test(message)) {
    return null;
  }
  const retryDelay = errorDetails?.find((d) =>
    d['@type']?.endsWith('RetryInfo'),
  )?.retryDelay;
  const seconds = retryDelay ? parseFloat(retryDelay) : NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : DEFAULT_QUOTA_PAUSE_MS;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  /** Modelos con la cuota agotada y hasta cuándo no usarlos (epoch ms). */
  private readonly exhaustedUntil = new Map<string, number>();

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

  /**
   * Ejecuta `fn` con el primer modelo disponible. Ante errores transitorios
   * (503/500) reintenta con backoff; si el modelo agotó su cuota (429) lo
   * saltea hasta que se renueve y pasa al siguiente.
   */
  private async withFallback<T>(fn: (model: string) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (const model of MODELS) {
      if ((this.exhaustedUntil.get(model) ?? 0) > Date.now()) {
        continue;
      }
      for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
        try {
          return await fn(model);
        } catch (error) {
          lastError = error;
          const pauseMs = quotaPauseMs(error);
          if (pauseMs !== null) {
            this.exhaustedUntil.set(model, Date.now() + pauseMs);
            this.logger.warn(
              `Gemini ${model} sin cuota por ${Math.ceil(pauseMs / 60_000)} min; uso el siguiente modelo`,
            );
            break;
          }
          if (!isTransientError(error)) throw error;
          this.logger.warn(
            `Gemini ${model} no disponible (intento ${attempt + 1}); reintentando`,
          );
          if (attempt < RETRIES_PER_MODEL) {
            await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          }
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('Todos los modelos de Gemini están sin cuota');
  }

  async chat(
    userId: string,
    userPrompt: string,
    loadHistory: boolean = true,
    historyLimit?: number,
  ): Promise<string> {
    // Cargar historial desde la base de datos (solo si la conversación está activa)
    const history = loadHistory
      ? await this.conversationService.getHistory(userId, historyLimit)
      : [];

    // Reglas del negocio desde el Google Doc (completo, o por RAG si es grande)
    const context = await this.googleDocsService.getContextFor(userPrompt);
    const systemInstruction = buildSystemPrompt(
      context,
      this.googleDocsService.getBusinessInfo(),
    );

    const response = await this.withFallback(async (modelName) => {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: { temperature: 0.3 },
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userPrompt);
      return result.response.text();
    });

    // Guardar los nuevos mensajes en la base de datos
    await this.conversationService.saveMessage(userId, 'user', userPrompt);
    await this.conversationService.saveMessage(userId, 'model', response);

    return response;
  }

  async detectAppointmentIntent(
    userId: string,
    userPrompt: string,
    loadHistory: boolean = true,
  ): Promise<AppointmentIntentResult> {
    const history = loadHistory
      ? await this.conversationService.getHistory(userId, 12)
      : [];

    const historyText = history
      .map((entry) => {
        const text = contentText(entry);
        return `${entry.role === 'user' ? 'Cliente' : 'Asistente'}: ${text}`;
      })
      .join('\n');

    const now = new Date();
    const business = this.googleDocsService.getBusinessInfo();
    const timeZone = business.timeZone || DEFAULT_TIME_ZONE;
    const localNow = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone,
    }).format(now);
    const context = await this.googleDocsService.getContextFor(userPrompt);

    const prompt = `Analiza si el cliente quiere agendar, reservar, mover o cancelar una cita/turno en Google Calendar.

Fecha actual ISO: ${now.toISOString()}
Fecha y hora actual en la zona del negocio: ${localNow}
Zona horaria del negocio: ${timeZone}

Informacion del negocio (servicios, duraciones, horarios y politicas):
${context.join('\n---\n') || 'Sin informacion'}

Historial reciente:
${historyText || 'Sin historial'}

Ultimo mensaje del cliente:
${userPrompt}

Responde SOLO con JSON valido, sin markdown ni texto extra, con esta forma exacta:
{
  "action": "create" | "reschedule" | "cancel" | "none",
  "intentDetected": boolean,
  "summary": string | null,
  "description": string | null,
  "startDateTime": string | null,
  "endDateTime": string | null,
  "targetStartDateTime": string | null,
  "targetEndDateTime": string | null,
  "missingFields": string[],
  "reply": string | null
}

Reglas:
- intentDetected=true solo si realmente hay una intencion clara de cita, turno, reserva, reprogramacion o cancelacion.
- action debe ser "create", "reschedule", "cancel" o "none".
- Si faltan datos indica en missingFields solo nombres de esta lista: summary, startDateTime, endDateTime, targetStartDateTime.
- summary debe ser breve y util: el servicio y el nombre del cliente, por ejemplo "Corte + Barba - Juan Perez".
- description debe resumir el servicio o motivo si aparece.
- startDateTime y endDateTime son la nueva fecha/hora para crear o reprogramar.
- targetStartDateTime y targetEndDateTime son la fecha/hora original de la cita a localizar para cancelar o reprogramar.
- Todas las fechas deben estar en formato ISO 8601 completo y SIEMPRE incluir zona horaria explicita, usando Z o un offset como -03:00.
- Calcula endDateTime con la duracion del servicio segun la informacion del negocio. Si no se sabe el servicio o su duracion, asume 1 hora.
- Para crear o reprogramar, el turno debe empezar y terminar dentro del horario de atencion de ese dia. Si no es asi, o el negocio cierra ese dia, devuelve startDateTime y endDateTime en null, agrega startDateTime a missingFields y en reply explica el horario de atencion y pide otro horario.
- Si la solicitud no cumple una politica del negocio (por ejemplo, la anticipacion minima para cancelar o reprogramar), devuelve en null las fechas de la accion y explica la politica en reply.
- Nunca agendes turnos en el pasado.
- Si el usuario quiere cancelar y no da hora final, targetEndDateTime puede ser null.
- Si no puedes inferir un campo con seguridad, devuelvelo en null.
- reply debe estar en espanol y ser el texto para enviar al cliente solo cuando falten datos o cuando la solicitud no se pueda ejecutar automaticamente.
- Si tienes todos los datos para ejecutar la accion, reply debe ser null.`;

    const generationConfig: GenerationConfig = {
      temperature: 0.1,
      responseMimeType: 'application/json',
    };
    const text = await this.withFallback(async (modelName) => {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig,
      });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    });

    try {
      const parsed = JSON.parse(text) as AppointmentIntentResult;
      return {
        action:
          parsed.action === 'create' ||
          parsed.action === 'reschedule' ||
          parsed.action === 'cancel'
            ? parsed.action
            : 'none',
        intentDetected: Boolean(parsed.intentDetected),
        summary: parsed.summary || null,
        description: parsed.description || null,
        startDateTime: parsed.startDateTime || null,
        endDateTime: parsed.endDateTime || null,
        targetStartDateTime: parsed.targetStartDateTime || null,
        targetEndDateTime: parsed.targetEndDateTime || null,
        missingFields: Array.isArray(parsed.missingFields)
          ? parsed.missingFields.filter((field) => typeof field === 'string')
          : [],
        reply: parsed.reply || null,
      };
    } catch {
      return {
        action: 'none',
        intentDetected: false,
        summary: null,
        description: null,
        startDateTime: null,
        endDateTime: null,
        targetStartDateTime: null,
        targetEndDateTime: null,
        missingFields: [],
        reply: null,
      };
    }
  }
}
