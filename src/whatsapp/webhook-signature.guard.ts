import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type { Request } from 'express';
import { safeEqual } from '../common/guards/api-key.guard';

/**
 * Valida la cabecera X-Hub-Signature-256 que Meta firma con el App Secret.
 * Si WHATSAPP_APP_SECRET no está definido se permite el paso con una
 * advertencia, para no romper despliegues existentes; en producción debe
 * configurarse.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);
  private warned = false;

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.configService.get<string>('WHATSAPP_APP_SECRET');

    if (!secret) {
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(
          'WHATSAPP_APP_SECRET no configurado: la firma del webhook NO se valida',
        );
      }
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.headers['x-hub-signature-256'];

    if (typeof signature !== 'string' || !request.rawBody) {
      throw new ForbiddenException('Firma ausente');
    }

    const expected =
      'sha256=' +
      createHmac('sha256', secret).update(request.rawBody).digest('hex');

    if (!safeEqual(signature, expected)) {
      throw new ForbiddenException('Firma inválida');
    }

    return true;
  }
}
