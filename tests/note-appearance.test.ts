import { describe, expect, it } from 'vitest'
import { normalizeNoteOpacity, resolveNoteOpacity } from '../src/lib/note-appearance'
import { normalizeNote } from '../src/lib/utils'

describe('per-note background opacity', () => {
  it('inherits global opacity for old notes and explicit reset', () => {
    for (const value of [undefined, null, '0.5', NaN, Infinity, {}, -Infinity]) {
      expect(normalizeNoteOpacity(value)).toBeNull()
      expect(resolveNoteOpacity(value, 0.65)).toBe(0.65)
    }
    expect(resolveNoteOpacity(null, NaN)).toBe(0.88)
  })
  it('preserves a note override and bounds transparency for usability', () => {
    expect(resolveNoteOpacity(0.4, 0.9)).toBe(0.4)
    expect(resolveNoteOpacity(0.4, 0.2)).toBe(0.4)
    expect(normalizeNoteOpacity(0)).toBe(0.1)
    expect(normalizeNoteOpacity(2)).toBe(1)
  })
  it('keeps custom colors and opacity through note normalization', () => {
    const saved = { id: 'appearance', color: '#327a65', backgroundOpacity: 0.4, items: [], noteType: 'independent' }
    expect(normalizeNote(saved)).toMatchObject({ color: '#327a65', backgroundOpacity: 0.4 })
    expect(normalizeNote({ ...saved, backgroundOpacity: null }).backgroundOpacity).toBeNull()
    expect(normalizeNote({ ...saved, backgroundOpacity: 'bad' }).backgroundOpacity).toBeNull()
  })
})
