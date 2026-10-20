import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { ApiKeyGuard } from './api-key.guard';
import { WebhookSignatureGuard } from '../../whatsapp/webhook-signature.guard';

const config = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const context = (request: object) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('ApiKeyGuard', () => {
  it('rejects everything when ADMIN_API_KEY is not configured', () => {
    const guard = new ApiKeyGuard(config({}));
    expect(() =>
      guard.canActivate(context({ headers: { 'x-api-key': 'x' } })),
    ).toThrow(UnauthorizedException);
  });

  it('accepts x-api-key and Bearer tokens, rejects wrong keys', () => {
    const guard = new ApiKeyGuard(config({ ADMIN_API_KEY: 'secret' }));

    expect(
      guard.canActivate(context({ headers: { 'x-api-key': 'secret' } })),
    ).toBe(true);
    expect(
      guard.canActivate(
        context({ headers: { authorization: 'Bearer secret' } }),
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(context({ headers: { 'x-api-key': 'nope' } })),
    ).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context({ headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });
});

describe('WebhookSignatureGuard', () => {
  const rawBody = Buffer.from('{"entry":[]}');
  const sign = (secret: string) =>
    'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

  it('accepts a valid signature', () => {
    const guard = new WebhookSignatureGuard(
      config({ WHATSAPP_APP_SECRET: 's3' }),
    );
    const request = { rawBody, headers: { 'x-hub-signature-256': sign('s3') } };
    expect(guard.canActivate(context(request))).toBe(true);
  });

  it('rejects an invalid or missing signature', () => {
    const guard = new WebhookSignatureGuard(
      config({ WHATSAPP_APP_SECRET: 's3' }),
    );

    expect(() =>
      guard.canActivate(
        context({ rawBody, headers: { 'x-hub-signature-256': sign('other') } }),
      ),
    ).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context({ rawBody, headers: {} }))).toThrow(
      ForbiddenException,
    );
  });

  it('lets requests through (with a warning) when no secret is configured', () => {
    const guard = new WebhookSignatureGuard(config({}));
    expect(guard.canActivate(context({ headers: {} }))).toBe(true);
  });
});
