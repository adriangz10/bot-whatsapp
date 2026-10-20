/**
 * Filtros baratos (sin LLM) para no gastar pedidos a Gemini en mensajes
 * que no los necesitan.
 */

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¡!¿?.,;:()*~_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const APPOINTMENT_HINTS = [
  /\bturnos?\b/,
  /\breserv/,
  /\bagend/,
  /\bcitas?\b/,
  /\bcancel/,
  /\breprogram/,
  /\banot(a|o|ar|as|ame|arme)\b/,
  /\b(mover|cambiar|pasar)\b/,
  /\b(lugar|disponib|libre|hueco)\b/,
  /\b(hoy|manana|pasado)\b/,
  /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|finde|semana)\b/,
  /\ba las?\b/,
  /\b\d{1,2}\s*(:\s*\d{2}|hs?\b|am\b|pm\b)/,
  /\b\d{1,2}\s*\/\s*\d{1,2}\b/,
];

/** Indica si vale la pena correr la detección de turnos (puede dar falsos positivos). */
export function mentionsAppointment(text: string): boolean {
  const normalized = normalize(text);
  return APPOINTMENT_HINTS.some((hint) => hint.test(normalized));
}

const GREETING =
  /^(hola+|holis|holi|buenas|buen dia|buenos dias|buenas tardes|buenas noches|que tal|hey)( (que tal|como (estas|va|andas)))?$/;
const THANKS =
  /^(muchas )?(gracias|grax|ok|oka|okey|dale|genial|perfecto|listo|joya|barbaro|buenisimo|chau|nos vemos)( (gracias|muchas gracias|chau))?$/;

export type SmallTalk = 'greeting' | 'thanks';

/** Saludos o agradecimientos sueltos, que se responden sin llamar al modelo. */
export function detectSmallTalk(text: string): SmallTalk | null {
  const normalized = normalize(text.replace(/\p{Extended_Pictographic}/gu, ''));
  if (GREETING.test(normalized)) return 'greeting';
  if (THANKS.test(normalized)) return 'thanks';
  return null;
}
