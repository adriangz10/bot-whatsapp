import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';

describe('GoogleCalendarService', () => {
  const createService = () =>
    new GoogleCalendarService(
      {
        get: jest.fn((key: string) => {
          if (key === 'GOOGLE_CALENDAR_ID') {
            return 'primary';
          }

          if (key === 'GOOGLE_CALENDAR_TIME_ZONE') {
            return 'America/Argentina/Buenos_Aires';
          }

          return undefined;
        }),
      } as unknown as ConfigService,
      {} as never,
    );

  it('accepts ISO datetimes with explicit UTC offset', () => {
    const service = createService();

    const parsed = (service as any).parseDateTime(
      '2026-04-15T15:00:00-03:00',
      'startDateTime',
    );

    expect(parsed).toBe('2026-04-15T18:00:00.000Z');
  });

  it('accepts ISO datetimes in UTC', () => {
    const service = createService();

    const parsed = (service as any).parseDateTime(
      '2026-04-15T18:00:00Z',
      'startDateTime',
    );

    expect(parsed).toBe('2026-04-15T18:00:00.000Z');
  });

  it('rejects ISO datetimes without timezone', () => {
    const service = createService();

    expect(() =>
      (service as any).parseDateTime('2026-04-15T15:00:00', 'startDateTime'),
    ).toThrow(
      'startDateTime must be a valid ISO date with timezone, for example 2026-04-15T15:00:00-03:00 or 2026-04-15T18:00:00Z',
    );
  });
});
