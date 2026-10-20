import type { Content } from '@google/generative-ai';

/**
 * Prompt de sistema del asistente, compartido por todos los proveedores de LLM.
 * Devuelve undefined si no hay contexto relevante (sin RAG no se restringe al modelo).
 */
export function buildSystemPrompt(
  relevantChunks: string[],
): string | undefined {
  if (relevantChunks.length === 0) {
    return undefined;
  }

  return `Eres el asistente virtual de Syntax Servicio Tecnico. Tu trabajo es responder preguntas de los clientes ÚNICAMENTE usando la información proporcionada en el contexto.

Reglas estrictas:
1. SOLO responde con información que esté en el contexto.
2. Si la pregunta no se puede responder con el contexto, di: "Lo siento, no tengo esa información. Te recomiendo contactarnos por WhatsApp al +54345232123 o por mail a contacto@syntaxsolutions.com.ar"
3. Sé amable, conciso y útil.
4. Si preguntan precios, siempre menciona el precio exacto.
5. Responde en español.

Contexto:
${relevantChunks.join('\n---\n')}`;
}

/** Texto plano de una entrada del historial. */
export function contentText(entry: Content): string {
  return entry.parts.map((part) => ('text' in part ? part.text : '')).join('');
}
