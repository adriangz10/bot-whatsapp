import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function extractApiKey(headers: Request['headers']): string | null {
  const header = headers['x-api-key'];
  if (typeof header === 'string' && header) {
    return header;
  }

  const authorization = headers.authorization;
  if (
    typeof authorization === 'string' &&
    authorization.startsWith('Bearer ')
  ) {
    return authorization.slice('Bearer '.length).trim() || null;
  }

  return null;
}

/**
 * Protege los endpoints de administración con la clave ADMIN_API_KEY.
 * Si la variable no está configurada se rechaza todo (fail closed).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('ADMIN_API_KEY');
    if (!expected) {
      throw new UnauthorizedException('ADMIN_API_KEY no está configurada');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = extractApiKey(request.headers);

    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('API key inválida');
    }

    return true;
  }
}
