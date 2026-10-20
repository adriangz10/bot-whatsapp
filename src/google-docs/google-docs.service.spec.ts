import { ConfigService } from '@nestjs/config';
import type { docs_v1 } from 'googleapis/build/src/apis/docs';
import { GoogleDocsService } from './google-docs.service';
import type { RagService } from '../rag/rag.service';

const paragraph = (text: string): docs_v1.Schema$StructuralElement => ({
  paragraph: { elements: [{ textRun: { content: `${text}\n` } }] },
});

const cell = (text: string): docs_v1.Schema$TableCell => ({
  content: [paragraph(text)],
});

const document: docs_v1.Schema$Document = {
  body: {
    content: [
      paragraph('Datos del negocio'),
      paragraph('Nombre del negocio: Barbería Cortez & Co.'),
      paragraph('Nombre del asistente: CortezBot'),
      paragraph('Contacto: WhatsApp +54 9 11 5555-1450'),
      paragraph('Zona horaria: America/Argentina/Buenos_Aires'),
      {
        table: {
          tableRows: [
            { tableCells: [cell('Servicio'), cell('Precio')] },
            { tableCells: [cell('Corte'), cell('$12.000')] },
          ],
        },
      },
    ],
  },
};

describe('GoogleDocsService', () => {
  const rag = { search: jest.fn(), indexDocument: jest.fn() };
  let service: GoogleDocsService;

  beforeEach(async () => {
    service = new GoogleDocsService(
      new ConfigService({ GOOGLE_DOCS_DOCUMENT_ID: 'doc' }),
      rag as unknown as RagService,
    );
    const docsClient = {
      documents: { get: jest.fn().mockResolvedValue({ data: document }) },
    };
    Object.assign(service, { docsClient });
    await service.reload();
  });

  it('reads tables as "cell | cell" rows', () => {
    expect(service.getContext()).toContain(
      'Servicio | Precio\nCorte | $12.000',
    );
  });

  it('takes the business identity from "Key: value" lines', () => {
    expect(service.getBusinessInfo()).toEqual({
      name: 'Barbería Cortez & Co.',
      assistantName: 'CortezBot',
      contact: 'WhatsApp +54 9 11 5555-1450',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  });

  it('sends a small document whole, without RAG', async () => {
    await expect(service.getContextFor('precio')).resolves.toEqual([
      service.getContext(),
    ]);
    expect(rag.search).not.toHaveBeenCalled();
    expect(rag.indexDocument).not.toHaveBeenCalled();
  });
});
