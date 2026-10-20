import { buildSystemPrompt, contentText } from './assistant-prompt';

describe('assistant-prompt', () => {
  it('still builds a prompt without context', () => {
    expect(buildSystemPrompt([])).toContain(
      'No hay información del negocio disponible',
    );
  });

  it('embeds the context separated by --- under "Información del negocio:"', () => {
    const prompt = buildSystemPrompt(['uno', 'dos']);

    expect(prompt).toContain('el asistente virtual del negocio');
    expect(prompt).toContain('Información del negocio:\nuno\n---\ndos');
  });

  it('uses the business identity from the document', () => {
    const prompt = buildSystemPrompt(['x'], {
      name: 'Barbería Cortez & Co.',
      assistantName: 'CortezBot',
      contact: 'WhatsApp +54 9 11 5555-1450',
    });

    expect(prompt).toContain(
      'Eres CortezBot, el asistente virtual de Barbería Cortez & Co.',
    );
    expect(prompt).toContain('contactar por WhatsApp +54 9 11 5555-1450');
  });

  it('joins the text parts of a history entry', () => {
    expect(
      contentText({ role: 'user', parts: [{ text: 'ho' }, { text: 'la' }] }),
    ).toBe('hola');
  });
});
