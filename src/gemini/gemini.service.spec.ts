import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import type { ConversationService } from '../conversation/conversation.service';
import type { GoogleDocsService } from '../google-docs/google-docs.service';

type WithFallback = <T>(fn: (model: string) => Promise<T>) => Promise<T>;

/** Misma forma que el 429 de cuota diaria que devuelve la API. */
const quotaError = Object.assign(
  new Error('[429 Too Many Requests] You exceeded your current quota'),
  {
    status: 429,
    errorDetails: [
      {
        '@type': 'type.googleapis.com/google.rpc.RetryInfo',
        retryDelay: '36462s',
      },
    ],
  },
);

describe('GeminiService model fallback', () => {
  let withFallback: WithFallback;

  beforeEach(() => {
    const service = new GeminiService(
      new ConfigService({ GEMINI_API_KEY: 'test' }),
      {} as ConversationService,
      {} as GoogleDocsService,
    );
    const internals = service as unknown as { withFallback: WithFallback };
    withFallback = internals.withFallback.bind(service) as WithFallback;
  });

  it('switches to the next model without retrying when the quota is exhausted', async () => {
    const fn = jest.fn((model: string) =>
      model === 'gemini-3.6-flash'
        ? Promise.reject(quotaError)
        : Promise.resolve(`ok:${model}`),
    );

    await expect(withFallback(fn)).resolves.toBe('ok:gemini-2.5-flash-lite');
    expect(fn.mock.calls.map(([m]) => m)).toEqual([
      'gemini-3.6-flash',
      'gemini-2.5-flash-lite',
    ]);

    // El modelo sin cuota queda salteado en los pedidos siguientes
    fn.mockClear();
    await withFallback(fn);
    expect(fn.mock.calls.map(([m]) => m)).toEqual(['gemini-2.5-flash-lite']);
  });

  it('fails clearly when every model is out of quota', async () => {
    const fn = jest.fn(() => Promise.reject(quotaError));

    await expect(withFallback(fn)).rejects.toThrow(quotaError);
    await expect(withFallback(fn)).rejects.toThrow('sin cuota');
  });
});
