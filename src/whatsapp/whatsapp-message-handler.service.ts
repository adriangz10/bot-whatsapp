import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookDto } from './whatsapp-webhook.dto';
import { ProcessedMessageService } from './processed-message.service';
import { GeminiService } from '../gemini/gemini.service';
import { OpenAIService } from '../openai/openai.service';
import { ChatsService } from '../chats/chats.service';
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
import { detectSmallTalk, mentionsAppointment } from './message-filters.util';

type WebhookValue =
  WhatsAppWebhookDto['entry'][number]['changes'][number]['value'];
type IncomingMessage = NonNullable<WebhookValue['messages']>[number];

const GEMINI_TIMEOUT_MS = 30_000;
const INACTIVITY_MINUTES = 30;
/** Espera para juntar mensajes seguidos del mismo usuario en un solo pedido al modelo. */
const BATCH_WINDOW_MS = 3_000;
/** Cuánto dura una gestión de turno abierta (el bot pidió datos y espera respuesta). */
const PENDING_APPOINTMENT_MS = 30 * 60 * 1000;
const CHAT_HISTORY_LIMIT = 16;

interface PendingBatch {
  messages: IncomingMessage[];
  value: WebhookValue;
  timer?: NodeJS.Timeout;
}

/**
 * Orquesta el procesamiento de los mensajes entrantes de WhatsApp:
 * audio -> texto, cliente/chat, citas (Google Calendar) y, si no, Gemini + Google Docs.
 * Se ejecuta fuera del ciclo request/response del webhook.
 *
 * Para ahorrar pedidos al modelo: junta los mensajes seguidos de un usuario,
 * responde saludos sin LLM y solo detecta turnos cuando el mensaje los menciona.
 */
@Injectable()
export class WhatsAppMessageHandler {
  private readonly logger = new Logger(WhatsAppMessageHandler.name);
  /** Cola por usuario: los mensajes de un mismo número se procesan en orden. */
  private readonly userQueues = new Map<string, Promise<void>>();
  private readonly batches = new Map<string, PendingBatch>();
  /** Usuarios con una gestión de turno en curso, y desde cuándo. */
  private readonly pendingAppointments = new Map<string, number>();
  /** Usuarios cuya foto de perfil ya se consultó en esta ejecución. */
  private readonly profilePictureChecked = new Set<string>();

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly geminiService: GeminiService,
    private readonly openaiService: OpenAIService,
    private readonly chatsService: ChatsService,
    private readonly conversationService: ConversationService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly clientsService: ClientsService,
    private readonly googleDocsService: GoogleDocsService,
    private readonly processedMessages: ProcessedMessageService,
  ) {}

  /** Agrupa los mensajes del payload por usuario (Meta puede mandar varios) y retorna enseguida. */
  dispatch(body: WhatsAppWebhookDto): void {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          this.collect(message, change.value);
        }
      }
    }
  }

  /** Reinicia la espera con cada mensaje nuevo; al vencer, procesa todos juntos. */
  private collect(message: IncomingMessage, value: WebhookValue): void {
    const from = message.from;
    const batch = this.batches.get(from) ?? { messages: [], value };
    clearTimeout(batch.timer);
    batch.messages.push(message);
    batch.value = value;
    batch.timer = setTimeout(() => {
      this.batches.delete(from);
      this.enqueue(from, batch.messages, batch.value);
    }, BATCH_WINDOW_MS);
    this.batches.set(from, batch);
  }

  private enqueue(
    from: string,
    messages: IncomingMessage[],
    value: WebhookValue,
  ): void {
    const previous = this.userQueues.get(from) ?? Promise.resolve();
    const next: Promise<void> = previous
      .then(() => this.processMessages(messages, value))
      .catch((error) => {
        this.logger.error(
          `Webhook error: ${error instanceof Error ? error.message : error}`,
        );
      })
      .finally(() => {
        if (this.userQueues.get(from) === next) {
          this.userQueues.delete(from);
        }
      });

    this.userQueues.set(from, next);
  }

  private async processMessages(
    messages: IncomingMessage[],
    value: WebhookValue,
  ): Promise<void> {
    const claimed: IncomingMessage[] = [];
    for (const message of messages) {
      if (!message.id || (await this.processedMessages.claim(message.id))) {
        claimed.push(message);
      }
    }

    if (claimed.length === 0) {
      return;
    }

    try {
      await this.handleMessages(claimed, value);
    } catch (error) {
      // Liberar para que el reintento de Meta pueda procesarlos de nuevo
      for (const message of claimed) {
        if (message.id) {
          await this.processedMessages
            .release(message.id)
            .catch(() => undefined);
        }
      }
      throw error;
    }
  }

  /** Texto del mensaje; los audios se transcriben. */
  private async messageText(
    message: IncomingMessage,
  ): Promise<string | undefined> {
    if (message.type !== 'audio' || !message.audio) {
      return message.text?.body;
    }

    try {
      const audioBuffer = await this.whatsappService.downloadMedia(
        message.audio.id,
      );
      return await this.openaiService.transcribe(audioBuffer);
    } catch (err) {
      this.logger.error(
        `Error transcribing audio: ${err instanceof Error ? err.message : err}`,
      );
      await this.whatsappService.sendMessage(
        message.from,
        'No pude procesar el audio. Por favor, envíalo de nuevo o escríbeme tu consulta.',
      );
      return undefined;
    }
  }

  private async handleMessages(
    messages: IncomingMessage[],
    value: WebhookValue,
  ): Promise<void> {
    const from = messages[0].from;
    const texts: string[] = [];
    for (const message of messages) {
      const messageText = await this.messageText(message);
      if (messageText?.trim()) {
        texts.push(messageText.trim());
      }
    }

    if (texts.length === 0) {
      return;
    }
    const text = texts.join('\n');

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
    // La foto se consulta una vez por usuario y ejecución, no en cada mensaje
    if (chat && !this.profilePictureChecked.has(from)) {
      this.profilePictureChecked.add(from);
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
      this.pendingAppointments.delete(from);
    }

    const pendingAppointment = await this.hasPendingAppointment(from);

    // Saludos y agradecimientos sueltos: respuesta fija, sin pedido al modelo
    const smallTalk = pendingAppointment ? null : detectSmallTalk(text);
    if (smallTalk) {
      await this.conversationService.saveMessage(from, 'user', text);
      await this.reply(from, this.smallTalkReply(smallTalk));
      return;
    }

    // La detección de turnos solo corre si el mensaje habla de turnos o hay uno en curso
    if (pendingAppointment || mentionsAppointment(text)) {
      let appointmentIntent = await this.geminiService.detectAppointmentIntent(
        from,
        text,
        !isInactive,
      );

      if (!appointmentIntent.intentDetected && pendingAppointment) {
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
    }

    // Flujo normal: Gemini con la información del Google Doc
    let timer: NodeJS.Timeout | undefined;
    try {
      const response = await Promise.race([
        this.geminiService.chat(from, text, !isInactive, CHAT_HISTORY_LIMIT),
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

  /**
   * Hay un turno en curso si el bot pidió datos en los últimos minutos,
   * o (tras un reinicio) si su último mensaje fue el pedido de datos del cliente.
   */
  private async hasPendingAppointment(userId: string): Promise<boolean> {
    const since = this.pendingAppointments.get(userId);
    if (since !== undefined) {
      if (Date.now() - since < PENDING_APPOINTMENT_MS) return true;
      this.pendingAppointments.delete(userId);
    }

    const [last] = await this.conversationService.getHistory(userId, 1);
    return (
      last?.role === 'model' &&
      contentText(last).startsWith(CLIENT_DATA_REQUEST_PREFIX)
    );
  }

  private smallTalkReply(kind: 'greeting' | 'thanks'): string {
    const { name, assistantName, greeting } =
      this.googleDocsService.getBusinessInfo();

    if (kind === 'thanks') {
      return '¡De nada! Si necesitás algo más, escribime.';
    }
    if (greeting) {
      return greeting;
    }

    const who = [
      assistantName ? `Soy ${assistantName}` : 'Soy el asistente virtual',
      name ? ` de ${name}` : '',
    ].join('');
    return `¡Hola! ${who}. ¿En qué te puedo ayudar? Podés consultarme precios y horarios, o pedir un turno.`;
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
    // Queda abierta hasta que se agende, reprograme o cancele
    this.pendingAppointments.set(from, Date.now());

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
            `Servicio: ${created.event.summary}`,
            `Fecha: ${this.formatAppointmentDate(
              created.event.start?.dateTime || appointmentIntent.startDateTime,
            )}`,
          ].join('\n'),
        );
        this.pendingAppointments.delete(from);
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
            `Servicio: ${updated.event.summary}`,
            `Nueva fecha: ${this.formatAppointmentDate(
              updated.event.start?.dateTime || appointmentIntent.startDateTime,
            )}`,
          ].join('\n'),
        );
        this.pendingAppointments.delete(from);
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
            `Servicio: ${cancelled.event.summary}`,
            `Fecha: ${this.formatAppointmentDate(
              cancelled.event.start?.dateTime ||
                appointmentIntent.targetStartDateTime,
            )}`,
          ].join('\n'),
        );
        this.pendingAppointments.delete(from);
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

  /** Ej.: "sábado 24 de octubre, 10:30 hs" en la zona horaria del negocio. */
  private formatAppointmentDate(dateTime: string): string {
    const timeZone =
      this.googleDocsService.getBusinessInfo().timeZone ||
      'America/Argentina/Buenos_Aires';
    const date = new Date(dateTime);
    const day = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone,
    }).format(date);
    const time = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }).format(date);
    return `${day.replace(',', '')}, ${time} hs`;
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
