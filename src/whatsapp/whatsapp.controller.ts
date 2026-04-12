import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './whatsapp.dto';
import { WhatsAppWebhookDto } from './whatsapp-webhook.dto';
import { GeminiService } from '../gemini/gemini.service';
import { ChatsService } from '../chats/chats.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService,
    private readonly chatsService: ChatsService,
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
      const text = message.text?.body;

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

      // Obtener respuesta de Gemini con timeout
      const timeoutMs = 30000;
      const response = await Promise.race([
        this.geminiService.chat(from, text),
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