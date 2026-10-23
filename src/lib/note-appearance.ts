export function normalizeNoteOpacity(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0.1, value)) : null
}

export function resolveNoteOpacity(value: unknown, globalOpacity: number): number {
  return normalizeNoteOpacity(value) ?? normalizeNoteOpacity(globalOpacity) ?? 0.88
}
