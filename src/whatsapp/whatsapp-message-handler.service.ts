import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookDto } from './whatsapp-webhook.dto';
import { ProcessedMessageService } from './processed-message.service';
import { GeminiService } from '../gemini/gemini.service';
import { OpenAIService } from '../openai/openai.service';
import { ChatsService } from '../chats/chats.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConversationService } from '../conversation/conversation.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { ClientsService } from '../clients/clients.service';
import { GoogleDocsService } from '../google-docs/google-docs.service';
import { contentText } from '../conversation/assistant-prompt';
import type { AppointmentIntentResult } from '../gemini/gemini.service';
import {
  CLIENT_DATA_REQUEST_PREFIX,
  buildMissingClientDataMessage,
  extractClientData,
  getMissingRequiredClientFields,
} from './client-data.util';

type WebhookValue =
  WhatsAppWebhookDto['entry'][number]['changes'][number]['value'];
type IncomingMessage = NonNullable<WebhookValue['messages']>[number];

const GEMINI_TIMEOUT_MS = 30_000;
const INACTIVITY_MINUTES = 30;

/**
 * Orquesta el procesamiento de los mensajes entrantes de WhatsApp:
 * audio -> texto, cliente/chat, citas, palabras clave, precios y, por último, Gemini + RAG.
 * Se ejecuta fuera del ciclo request/response del webhook.
 */
@Injectable()
export class WhatsAppMessageHandler {
  private readonly logger = new Logger(WhatsAppMessageHandler.name);
  /** Cola por usuario: los mensajes de un mismo número se procesan en orden. */
  private readonly userQueues = new Map<string, Promise<void>>();

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly geminiService: GeminiService,
    private readonly openaiService: OpenAIService,
    private readonly chatsService: ChatsService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly conversationService: ConversationService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly clientsService: ClientsService,
    private readonly googleDocsService: GoogleDocsService,
    private readonly processedMessages: ProcessedMessageService,
  ) {}

  /** Encola todos los mensajes del payload (Meta puede agrupar varios) y retorna enseguida. */
  dispatch(body: WhatsAppWebhookDto): void {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          this.enqueue(message, change.value);
        }
      }
    }
  }

  private enqueue(message: IncomingMessage, value: WebhookValue): void {
    const previous = this.userQueues.get(message.from) ?? Promise.resolve();
    const next: Promise<void> = previous
      .then(() => this.processMessage(message, value))
      .catch((error) => {
        this.logger.error(
          `Webhook error: ${error instanceof Error ? error.message : error}`,
        );
      })
      .finally(() => {
        if (this.userQueues.get(message.from) === next) {
          this.userQueues.delete(message.from);
        }
      });

    this.userQueues.set(message.from, next);
  }

  private async processMessage(
    message: IncomingMessage,
    value: WebhookValue,
  ): Promise<void> {
    const messageId = message.id;

    if (messageId && !(await this.processedMessages.claim(messageId))) {
      return;
    }

    try {
      await this.handleMessage(message, value);
    } catch (error) {
      // Liberar para que el reintento de Meta pueda procesarlo de nuevo
      if (messageId) {
        await this.processedMessages.release(messageId).catch(() => undefined);
      }
      throw error;
    }
  }

  private async handleMessage(
    message: IncomingMessage,
    value: WebhookValue,
  ): Promise<void> {
    const from = message.from;
    let text: string | undefined;

    if (message.type === 'audio' && message.audio) {
      try {
        const audioBuffer = await this.whatsappService.downloadMedia(
          message.audio.id,
        );
        text = await this.openaiService.transcribe(audioBuffer);
      } catch (err) {
        this.logger.error(
          `Error transcribing audio: ${err instanceof Error ? err.message : err}`,
        );
        await this.whatsappService.sendMessage(
          from,
          'No pude procesar el audio. Por favor, envíalo de nuevo o escríbeme tu consulta.',
        );
        return;
      }
    } else {
      text = message.text?.body;
    }

    if (!text) {
      return;
    }

    const contact =
      value.contacts?.find((c) => c.wa_id === from) ?? value.contacts?.[0];
    const contactName = contact?.profile?.name || null;

    const client = await this.clientsService.upsertByUserId(from, {
      fullName: contactName || undefined,
      phone: from,
    });

    const chat = await this.chatsService.upsertByUserId(
      from,
      contactName || undefined,
    );
    if (client && chat.clientId !== client.id) {
      await this.chatsService.update(chat.id, { clientId: client.id });
    }
    if (chat) {
      const profilePictureUrl =
        await this.whatsappService.getProfilePicture(from);
      if (profilePictureUrl) {
        await this.chatsService.update(chat.id, { profilePictureUrl });
      }
    }

    // Verificar inactividad (sin mensajes durante INACTIVITY_MINUTES)
    const isInactive = chat
      ? this.chatsService.isInactive(chat, INACTIVITY_MINUTES)
      : false;
    if (isInactive) {
      await this.chatsService.reactivate(chat.id);
    }

    let appointmentIntent = await this.geminiService.detectAppointmentIntent(
      from,
      text,
      !isInactive,
    );

    if (!appointmentIntent.intentDetected) {
      const recoveredIntent = await this.recoverPendingAppointmentIntent(
        from,
        text,
      );
      if (recoveredIntent) {
        appointmentIntent = recoveredIntent;
      }
    }

    if (appointmentIntent.intentDetected) {
      await this.handleAppointmentIntent({
        from,
        text,
        appointmentIntent,
        client,
        chatId: chat?.id,
        contactName,
      });
      return;
    }

    // Respuestas por palabra clave (Google Sheets)
    const keywordMatch = this.googleSheetsService.findKeyword(text);
    if (keywordMatch) {
      await this.conversationService.saveMessage(from, 'user', text);

      if (keywordMatch.media) {
        await this.whatsappService.sendMediaMessage(
          from,
          keywordMatch.media,
          keywordMatch.answer,
        );
        await this.conversationService.saveMessage(
          from,
          'model',
          `${keywordMatch.answer}\n[Media: ${keywordMatch.media}]`,
        );
      } else {
        await this.whatsappService.sendMessage(from, keywordMatch.answer);
        await this.conversationService.saveMessage(
          from,
          'model',
          keywordMatch.answer,
        );
      }
      return;
    }

    // Precios (Google Docs)
    const priceAnswer = this.googleDocsService.findPriceAnswer(text);
    if (priceAnswer) {
      await this.conversationService.saveMessage(from, 'user', text);
      await this.whatsappService.sendMessage(from, priceAnswer);
      await this.conversationService.saveMessage(from, 'model', priceAnswer);
      return;
    }

    // Flujo normal: Gemini + RAG
    let timer: NodeJS.Timeout | undefined;
    try {
      const response = await Promise.race([
        this.geminiService.chat(from, text, !isInactive),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Gemini timeout')),
            GEMINI_TIMEOUT_MS,
          );
        }),
      ]);
      await this.whatsappService.sendMessage(from, response);
    } finally {
      clearTimeout(timer);
    }
  }

  private async reply(userId: string, content: string): Promise<void> {
    await this.whatsappService.sendMessage(userId, content);
    await this.conversationService.saveMessage(userId, 'model', content);
  }

  private async handleAppointmentIntent(params: {
    from: string;
    text: string;
    appointmentIntent: AppointmentIntentResult;
    client: Awaited<ReturnType<ClientsService['upsertByUserId']>>;
    chatId?: number;
    contactName: string | null;
  }): Promise<void> {
    const { from, text, appointmentIntent, client, chatId, contactName } =
      params;

    await this.conversationService.saveMessage(from, 'user', text);

    const missingDataReply =
      appointmentIntent.reply ||
      'Necesito mas datos para gestionar la cita. Indicame dia, hora y motivo.';

    try {
      if (
        appointmentIntent.action === 'create' &&
        appointmentIntent.summary &&
        appointmentIntent.startDateTime &&
        appointmentIntent.endDateTime
      ) {
        const updatedClient = await this.clientsService.upsertByUserId(from, {
          ...extractClientData(text, client.fullName),
          phone: from,
        });
        const missingClientFields =
          getMissingRequiredClientFields(updatedClient);

        if (missingClientFields.length > 0) {
          await this.reply(
            from,
            buildMissingClientDataMessage(missingClientFields),
          );
          return;
        }

        const created = await this.googleCalendarService.createAppointment({
          summary: appointmentIntent.summary,
          description: appointmentIntent.description || undefined,
          startDateTime: appointmentIntent.startDateTime,
          endDateTime: appointmentIntent.endDateTime,
          userId: from,
          chatId,
          clientId: updatedClient.id,
          contactName: updatedClient.fullName || contactName || undefined,
        });

        await this.reply(
          from,
          [
            `Tu cita fue agendada correctamente (${updatedClient.fullName || `${updatedClient.firstName} ${updatedClient.lastName}`.trim()}).`,
            `Titulo: ${created.event.summary}`,
            `Inicio: ${this.formatAppointmentStart(
              created.event.start?.dateTime || appointmentIntent.startDateTime,
            )}`,
          ].join('\n'),
        );
        return;
      }

      if (
        appointmentIntent.action === 'reschedule' &&
        appointmentIntent.targetStartDateTime &&
        appointmentIntent.startDateTime &&
        appointmentIntent.endDateTime
      ) {
        const updated = await this.googleCalendarService.rescheduleAppointment({
          targetStartDateTime: appointmentIntent.targetStartDateTime,
          targetEndDateTime: appointmentIntent.targetEndDateTime,
          summary: appointmentIntent.summary,
          userId: from,
          chatId,
          clientId: client.id,
          contactName: client.fullName || contactName || undefined,
          newStartDateTime: appointmentIntent.startDateTime,
          newEndDateTime: appointmentIntent.endDateTime,
        });

        await this.reply(
          from,
          [
            'Tu cita fue reprogramada correctamente.',
            `Titulo: ${updated.event.summary}`,
            `Nuevo inicio: ${updated.event.start?.dateTime || appointmentIntent.startDateTime}`,
            `Nuevo fin: ${updated.event.end?.dateTime || appointmentIntent.endDateTime}`,
            updated.event.htmlLink ? `Link: ${updated.event.htmlLink}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
        );
        return;
      }

      if (
        appointmentIntent.action === 'cancel' &&
        appointmentIntent.targetStartDateTime
      ) {
        const cancelled = await this.googleCalendarService.cancelAppointment({
          targetStartDateTime: appointmentIntent.targetStartDateTime,
          targetEndDateTime: appointmentIntent.targetEndDateTime,
          summary: appointmentIntent.summary,
          userId: from,
        });

        await this.reply(
          from,
          [
            'Tu cita fue cancelada correctamente.',
            `Titulo: ${cancelled.event.summary}`,
            `Inicio original: ${cancelled.event.start?.dateTime || appointmentIntent.targetStartDateTime}`,
          ].join('\n'),
        );
        return;
      }
    } catch (error) {
      const appointmentError = error instanceof Error ? error.message : '';
      await this.reply(from, this.appointmentErrorMessage(appointmentError));
      return;
    }

    await this.reply(from, missingDataReply);
  }

  private appointmentErrorMessage(error: string): string {
    if (error.includes('not available')) {
      return 'Ese horario ya no esta disponible. Enviame otro dia y horario y lo reviso.';
    }
    if (error.includes('No matching appointment')) {
      return 'No encontre una cita que coincida con esos datos. Decime el dia y horario exactos de la cita original.';
    }
    if (error.includes('Multiple appointments matched')) {
      return 'Encontre mas de una cita parecida. Decime el dia, horario exacto y motivo para identificarla bien.';
    }
    return 'No pude gestionar la cita automaticamente. Enviame mas detalle o contacta al equipo para revisarlo.';
  }

  private formatAppointmentStart(dateTime: string): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: true,
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(dateTime));
  }

  /**
   * Si el bot pidió datos del cliente en el turno anterior, reconstruye la solicitud
   * de cita original combinándola con la respuesta actual.
   */
  private async recoverPendingAppointmentIntent(
    userId: string,
    currentText: string,
  ): Promise<AppointmentIntentResult | null> {
    const history = await this.conversationService.getHistory(userId, 8);
    const textOf = (entry: (typeof history)[number]) =>
      contentText(entry).trim();

    let previousUserMessage: string | null = null;

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const entry = history[index];
      if (
        entry.role === 'model' &&
        textOf(entry).startsWith(CLIENT_DATA_REQUEST_PREFIX)
      ) {
        for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
          if (history[cursor].role === 'user') {
            previousUserMessage = textOf(history[cursor]);
            break;
          }
        }
        break;
      }
    }

    if (!previousUserMessage) {
      return null;
    }

    const recovered = await this.geminiService.detectAppointmentIntent(
      userId,
      `${previousUserMessage}\n\nDatos del cliente:\n${currentText}`,
      false,
    );

    return recovered.action === 'create' ? recovered : null;
  }
}
