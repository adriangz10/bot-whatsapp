import { detectSmallTalk, mentionsAppointment } from './message-filters.util';

describe('mentionsAppointment', () => {
  it.each([
    'Quiero un turno',
    'me anotás para un corte?',
    'tenés lugar el sábado?',
    'puedo ir mañana a las 10',
    'el 24/10 a las 18:30',
    'necesito cancelar',
    'a las 17hs',
  ])('detects "%s"', (text) => {
    expect(mentionsAppointment(text)).toBe(true);
  });

  it.each([
    'cuánto sale el corte?',
    'dónde queda la barbería',
    'aceptan mercado pago?',
  ])('ignores "%s"', (text) => {
    expect(mentionsAppointment(text)).toBe(false);
  });
});

describe('detectSmallTalk', () => {
  it.each(['Hola', '¡Hola!', 'buenas tardes', 'hola, qué tal?', 'Holaa 👋'])(
    'greeting: "%s"',
    (text) => {
      expect(detectSmallTalk(text)).toBe('greeting');
    },
  );

  it.each(['gracias!', 'Muchas gracias', 'dale', 'ok 👍', 'listo, gracias'])(
    'thanks: "%s"',
    (text) => {
      expect(detectSmallTalk(text)).toBe('thanks');
    },
  );

  it.each([
    'hola, cuánto sale el corte?',
    'gracias, y la barba?',
    'hola quiero turno',
  ])('leaves real questions to the model: "%s"', (text) => {
    expect(detectSmallTalk(text)).toBeNull();
  });
});
