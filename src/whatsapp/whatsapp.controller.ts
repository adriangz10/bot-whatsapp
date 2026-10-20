import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './whatsapp.dto';
import { WhatsAppWebhookDto } from './whatsapp-webhook.dto';
import { WhatsAppMessageHandler } from './whatsapp-message-handler.service';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly messageHandler: WhatsAppMessageHandler,
    private readonly configService: ConfigService,
  ) {}

  @Post('send')
  @UseGuards(ApiKeyGuard)
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

    if (verifyToken && mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    throw new ForbiddenException('Verification failed');
  }

  // Webhook - Recibir mensajes: responde 200 de inmediato y procesa en segundo plano
  @Post('webhook')
  @UseGuards(WebhookSignatureGuard)
  handleWebhook(@Body() body: WhatsAppWebhookDto): string {
    this.messageHandler.dispatch(body);
    return 'OK';
  }
}
