import { buildSystemPrompt, contentText } from './assistant-prompt';

describe('assistant-prompt', () => {
  it('returns undefined without context', () => {
    expect(buildSystemPrompt([])).toBeUndefined();
  });

  it('embeds the chunks separated by --- under "Contexto:"', () => {
    const prompt = buildSystemPrompt(['uno', 'dos']);

    expect(prompt).toContain('Syntax Servicio Tecnico');
    expect(prompt).toContain('Contexto:\nuno\n---\ndos');
  });

  it('joins the text parts of a history entry', () => {
    expect(
      contentText({ role: 'user', parts: [{ text: 'ho' }, { text: 'la' }] }),
    ).toBe('hola');
  });
});
