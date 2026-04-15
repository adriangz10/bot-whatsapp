import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './whatsapp.dto';
import { WhatsAppWebhookDto } from './whatsapp-webhook.dto';
import { GeminiService } from '../gemini/gemini.service';
import { OpenAIService } from '../openai/openai.service';
import { ChatsService } from '../chats/chats.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConversationService } from '../conversation/conversation.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly geminiService: GeminiService,
    private readonly openaiService: OpenAIService,
    private readonly configService: ConfigService,
    private readonly chatsService: ChatsService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly conversationService: ConversationService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  @Post('send')
  async sendMessage(@Body() body: SendMessageDto): Promise<any> {
    return await this.whatsappService.sendMessage(body.to, body.message);
  }

  // Webhook - Verificación
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
  ): string | number {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return 'Verification failed';
  }

  // Webhook - Recibir mensajes
  @Post('webhook')
  async handleWebhook(@Body() body: WhatsAppWebhookDto): Promise<string> {
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message) {
        return 'No message';
      }

      const from = message.from;
      const messageType = message.type;
      let text: string | undefined;

      // Procesar mensaje de audio: descargar, transcribir y usar como texto
      if (messageType === 'audio' && message.audio) {
        try {
          const audioBuffer = await this.whatsappService.downloadMedia(message.audio.id);
          text = await this.openaiService.transcribe(audioBuffer);
        } catch (err) {
          console.error('Error transcribing audio:', err instanceof Error ? err.message : err);
          await this.whatsappService.sendMessage(from, 'No pude procesar el audio. Por favor, envíalo de nuevo o escríbeme tu consulta.');
          return 'Error';
        }
      } else {
        text = message.text?.body;
      }

      if (!text) {
        return 'No text in message';
      }

      // Extraer nombre del contacto
      const contact = change?.value?.contacts?.[0];
      const contactName = contact?.profile?.name || null;

      // Obtener/crear chat y actualizar nombre y foto de perfil
      const chat = await this.chatsService.upsertByUserId(from, contactName || undefined);
      if (chat) {
        const profilePictureUrl = await this.whatsappService.getProfilePicture(from);
        if (profilePictureUrl) {
          await this.chatsService.update(chat.id, { profilePictureUrl } as any);
        }
      }

      // Verificar inactividad (30 minutos sin mensajes)
      const isInactive = chat ? this.chatsService.isInactive(chat, 30) : false;
      if (isInactive) {
        await this.chatsService.reactivate(chat.id);
      }

      const appointmentIntent = await this.geminiService.detectAppointmentIntent(
        from,
        text,
        !isInactive,
      );

      if (appointmentIntent.intentDetected) {
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
            const createdAppointment =
              await this.googleCalendarService.createAppointment({
                summary: appointmentIntent.summary,
                description: appointmentIntent.description || undefined,
                startDateTime: appointmentIntent.startDateTime,
                endDateTime: appointmentIntent.endDateTime,
                userId: from,
                chatId: chat?.id,
                contactName: contactName || undefined,
              });

            const confirmationMessage = [
              'Tu cita fue agendada correctamente.',
              `Titulo: ${createdAppointment.event.summary}`,
              `Inicio: ${createdAppointment.event.start?.dateTime || appointmentIntent.startDateTime}`,
              `Fin: ${createdAppointment.event.end?.dateTime || appointmentIntent.endDateTime}`,
              createdAppointment.event.htmlLink
                ? `Link: ${createdAppointment.event.htmlLink}`
                : null,
            ]
              .filter(Boolean)
              .join('\n');

            await this.whatsappService.sendMessage(from, confirmationMessage);
            await this.conversationService.saveMessage(
              from,
              'model',
              confirmationMessage,
            );

            return 'OK';
          }

          if (
            appointmentIntent.action === 'reschedule' &&
            appointmentIntent.targetStartDateTime &&
            appointmentIntent.startDateTime &&
            appointmentIntent.endDateTime
          ) {
            const updatedAppointment =
              await this.googleCalendarService.rescheduleAppointment({
                targetStartDateTime: appointmentIntent.targetStartDateTime,
                targetEndDateTime: appointmentIntent.targetEndDateTime,
                summary: appointmentIntent.summary,
                userId: from,
                chatId: chat?.id,
                contactName: contactName || undefined,
                newStartDateTime: appointmentIntent.startDateTime,
                newEndDateTime: appointmentIntent.endDateTime,
              });

            const rescheduleMessage = [
              'Tu cita fue reprogramada correctamente.',
              `Titulo: ${updatedAppointment.event.summary}`,
              `Nuevo inicio: ${updatedAppointment.event.start?.dateTime || appointmentIntent.startDateTime}`,
              `Nuevo fin: ${updatedAppointment.event.end?.dateTime || appointmentIntent.endDateTime}`,
              updatedAppointment.event.htmlLink
                ? `Link: ${updatedAppointment.event.htmlLink}`
                : null,
            ]
              .filter(Boolean)
              .join('\n');

            await this.whatsappService.sendMessage(from, rescheduleMessage);
            await this.conversationService.saveMessage(
              from,
              'model',
              rescheduleMessage,
            );

            return 'OK';
          }

          if (
            appointmentIntent.action === 'cancel' &&
            appointmentIntent.targetStartDateTime
          ) {
            const cancelledAppointment =
              await this.googleCalendarService.cancelAppointment({
                targetStartDateTime: appointmentIntent.targetStartDateTime,
                targetEndDateTime: appointmentIntent.targetEndDateTime,
                summary: appointmentIntent.summary,
                userId: from,
              });

            const cancelMessage = [
              'Tu cita fue cancelada correctamente.',
              `Titulo: ${cancelledAppointment.event.summary}`,
              `Inicio original: ${cancelledAppointment.event.start?.dateTime || appointmentIntent.targetStartDateTime}`,
            ].join('\n');

            await this.whatsappService.sendMessage(from, cancelMessage);
            await this.conversationService.saveMessage(
              from,
              'model',
              cancelMessage,
            );

            return 'OK';
          }
        } catch (error) {
          const appointmentError =
            error instanceof Error
              ? error.message
              : 'No se pudo procesar la cita en este momento.';

          let fallbackMessage =
            'No pude gestionar la cita automaticamente. Enviame mas detalle o contacta al equipo para revisarlo.';

          if (appointmentError.includes('not available')) {
            fallbackMessage =
              'Ese horario ya no esta disponible. Enviame otro dia y horario y lo reviso.';
          } else if (appointmentError.includes('No matching appointment')) {
            fallbackMessage =
              'No encontre una cita que coincida con esos datos. Decime el dia y horario exactos de la cita original.';
          } else if (appointmentError.includes('Multiple appointments matched')) {
            fallbackMessage =
              'Encontre mas de una cita parecida. Decime el dia, horario exacto y motivo para identificarla bien.';
          }

          await this.whatsappService.sendMessage(from, fallbackMessage);
          await this.conversationService.saveMessage(
            from,
            'model',
            fallbackMessage,
          );

          return 'OK';
        }

        await this.whatsappService.sendMessage(from, missingDataReply);
        await this.conversationService.saveMessage(
          from,
          'model',
          missingDataReply,
        );

        return 'OK';
      }

      // Verificar keyword match en Google Sheets
      const keywordMatch = this.googleSheetsService.findKeyword(text);

      if (keywordMatch) {
        // Guardar mensaje del usuario en historial
        await this.conversationService.saveMessage(from, 'user', text);

        if (keywordMatch.media) {
          // Enviar imagen/video con Answer como caption
          await this.whatsappService.sendMediaMessage(from, keywordMatch.media, keywordMatch.answer);
          await this.conversationService.saveMessage(from, 'model', `${keywordMatch.answer}\n[Media: ${keywordMatch.media}]`);
        } else {
          // Solo texto
          await this.whatsappService.sendMessage(from, keywordMatch.answer);
          await this.conversationService.saveMessage(from, 'model', keywordMatch.answer);
        }

        return 'OK';
      }

      // Flujo normal: Gemini + RAG
      const timeoutMs = 30000;
      const response = await Promise.race([
        this.geminiService.chat(from, text, !isInactive),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini timeout')), timeoutMs)
        ),
      ]);

      // Enviar respuesta por WhatsApp
      await this.whatsappService.sendMessage(from, response);

      return 'OK';
    } catch (error) {
      console.error('Webhook error:', error instanceof Error ? error.message : error);
      return 'Error';
    }
  }
}
