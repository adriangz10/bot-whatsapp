export const CLIENT_DATA_REQUEST_PREFIX =
  'Antes de agendar necesito estos datos del cliente:';
export const REQUIRED_CLIENT_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'address',
] as const;
export type RequiredClientField = (typeof REQUIRED_CLIENT_FIELDS)[number];

export interface ExtractedClientData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  documentId?: string;
  address?: string;
}

// Palabras que delimitan un campo del siguiente: un nombre nunca las contiene.
const STOP_WORDS =
  'apellido|dni|documento|mail|email|correo|direcci[oó]n|direccion|domicilio|nombre|completo|es';
const WORD = String.raw`(?!(?:${STOP_WORDS})\b)[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+`;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const FULL_NAME_RE = new RegExp(
  String.raw`(?:nombre(?:\s+completo)?|me llamo)\s*(?:es)?\s*[:,-]?\s*(${WORD}(?:\s+${WORD}){1,3})`,
  'i',
);
const FIRST_NAME_RE = new RegExp(
  String.raw`(?:nombre|me llamo)\s*(?:es)?\s*[:,-]?\s*(${WORD})`,
  'i',
);
const LAST_NAME_RE = new RegExp(
  String.raw`apellido\s*(?:es)?\s*[:,-]?\s*(${WORD}(?:\s+${WORD})*)`,
  'i',
);
const ADDRESS_RE =
  /(?:direccion|domicilio|dirección)\s*[:,-]?\s*([^.!\n]+?)(?=(?:\s+(?:dni|mail|email|correo|nombre|apellido)\b)|$)/i;
const DOCUMENT_RE = /(?:dni|documento)\s*[:#-]?\s*([0-9.-]{7,15})/i;

export function extractClientData(
  text: string,
  fallbackFullName?: string | null,
): ExtractedClientData {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const payload: ExtractedClientData = {};

  const email = normalizedText.match(EMAIL_RE);
  if (email) {
    payload.email = email[0];
  }

  const fullName = normalizedText.match(FULL_NAME_RE);
  if (fullName) {
    payload.fullName = fullName[1].trim();
  }

  const firstName = normalizedText.match(FIRST_NAME_RE);
  if (firstName) {
    payload.firstName = firstName[1].trim();
  }

  const lastName = normalizedText.match(LAST_NAME_RE);
  if (lastName) {
    payload.lastName = lastName[1].trim();
  }

  const address = normalizedText.match(ADDRESS_RE);
  if (address) {
    payload.address = address[1].trim().replace(/[.,;]+$/, '');
  }

  const documentId = normalizedText.match(DOCUMENT_RE);
  if (documentId) {
    payload.documentId = documentId[1].trim();
  }

  if (!payload.fullName && fallbackFullName?.trim()) {
    payload.fullName = fallbackFullName.trim();
  }

  if (payload.fullName && (!payload.firstName || !payload.lastName)) {
    const [first, ...rest] = payload.fullName.split(/\s+/);
    if (!payload.firstName && first) {
      payload.firstName = first;
    }
    if (!payload.lastName && rest.length > 0) {
      payload.lastName = rest.join(' ');
    }
  }

  return payload;
}

export function getMissingRequiredClientFields(client: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  address?: string | null;
}): RequiredClientField[] {
  return REQUIRED_CLIENT_FIELDS.filter((field) => !client[field]?.trim());
}

export function buildMissingClientDataMessage(
  missingFields: RequiredClientField[],
): string {
  const labels: Record<RequiredClientField, string> = {
    firstName: 'nombre',
    lastName: 'apellido',
    email: 'mail',
    address: 'direccion',
  };

  return `${CLIENT_DATA_REQUEST_PREFIX} ${missingFields
    .map((field) => labels[field])
    .join(', ')}. DNI opcional.`;
}
