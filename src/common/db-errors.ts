/** true si el error de MySQL/TypeORM es una violación de clave única (ER_DUP_ENTRY). */
export function isDuplicateEntry(error: unknown): boolean {
  const e = error as { code?: string; driverError?: { code?: string } };
  return e?.code === 'ER_DUP_ENTRY' || e?.driverError?.code === 'ER_DUP_ENTRY';
}
