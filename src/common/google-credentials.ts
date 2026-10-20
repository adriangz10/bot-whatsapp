export interface GoogleCredentials {
  client_email: string;
  private_key: string;
}

/**
 * Parsea GOOGLE_CREDENTIALS (JSON de la service account) y normaliza los saltos
 * de línea escapados de la clave privada. Lanza si el JSON es inválido o incompleto.
 */
export function parseGoogleCredentials(json: string): GoogleCredentials {
  const parsed = JSON.parse(json) as Partial<GoogleCredentials>;

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_CREDENTIALS requiere client_email y private_key');
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\n/g, '\n'),
  };
}

/** Mensaje legible de un error desconocido. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
