import {
  buildMissingClientDataMessage,
  extractClientData,
  getMissingRequiredClientFields,
} from './client-data.util';

describe('extractClientData', () => {
  it('extracts labelled fields without bleeding into the next label', () => {
    const data = extractClientData(
      'Nombre: Juan apellido: Perez Gomez mail: juan@example.com direccion: Calle 123 dni: 30.123.456',
    );

    expect(data).toMatchObject({
      firstName: 'Juan',
      lastName: 'Perez Gomez',
      email: 'juan@example.com',
      address: 'Calle 123',
      documentId: '30.123.456',
    });
  });

  it('splits a full name into first and last name', () => {
    const data = extractClientData('Me llamo Ana Maria Lopez');

    expect(data.fullName).toBe('Ana Maria Lopez');
    expect(data.firstName).toBe('Ana');
    expect(data.lastName).toBe('Maria Lopez');
  });

  it('handles "nombre completo" without treating "completo" as the first name', () => {
    const data = extractClientData('nombre completo: Luis Gomez');

    expect(data.firstName).toBe('Luis');
    expect(data.lastName).toBe('Gomez');
  });

  it('does not treat a bare "soy" as a name', () => {
    const data = extractClientData('Soy de Rosario y quiero un turno');

    expect(data.fullName).toBeUndefined();
    expect(data.firstName).toBeUndefined();
  });

  it('falls back to the WhatsApp profile name', () => {
    const data = extractClientData('mail: a@b.com', 'Maria Rossi');

    expect(data.firstName).toBe('Maria');
    expect(data.lastName).toBe('Rossi');
  });
});

describe('required client fields', () => {
  it('reports missing fields and builds the request message', () => {
    const missing = getMissingRequiredClientFields({
      firstName: 'Juan',
      lastName: ' ',
      email: null,
      address: 'Calle 1',
    });

    expect(missing).toEqual(['lastName', 'email']);
    expect(buildMissingClientDataMessage(missing)).toContain('apellido, mail');
  });
});
