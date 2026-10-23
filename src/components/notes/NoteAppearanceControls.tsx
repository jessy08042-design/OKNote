import { useState } from 'react'
import { NOTE_COLOR_PALETTE, normalizeHexColor } from '@/lib/utils'
import { resolveNoteOpacity } from '@/lib/note-appearance'
import { useNotesStore } from '@/stores/notes.store'
import type { Note } from '@/types/notes.types'

export function NoteAppearanceControls({ note, globalOpacity }: { note: Note; globalOpacity: number }) {
  const color = normalizeHexColor(note.color)
  const opacity = resolveNoteOpacity(note.backgroundOpacity, globalOpacity)
  const transparency = Math.round((1 - opacity) * 100)
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const update = (patch: Partial<Pick<Note, 'color' | 'backgroundOpacity'>>) => {
    const store = useNotesStore.getState()
    const latest = store.notes.find(n => n.id === note.id) || note
    store.updateNote({ ...latest, ...patch, updatedAt: new Date().toISOString() })
  }
  const applyHex = () => {
    if (hexDraft === null) return
    const value = hexDraft.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(value)) { update({ color: value }); setHexDraft(null); setInvalid(false) }
    else setInvalid(true)
  }
  return <div className="space-y-3 px-3 py-2 text-xs" role="group" aria-label="便签外观"
    onKeyDown={e => { if (e.key !== 'Escape') e.stopPropagation() }}>
    <div className="font-medium opacity-70">背景颜色</div>
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="预设背景颜色">
      {NOTE_COLOR_PALETTE.map((preset, index) => <button key={preset} type="button" autoFocus={index === 0}
        onClick={() => { setHexDraft(null); setInvalid(false); update({ color: preset }) }}
        className={`h-6 w-6 shrink-0 rounded-full transition-transform hover:scale-110 ${preset.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-current ring-offset-1 ring-offset-background' : ''}`}
        style={{ backgroundColor: preset, boxShadow: 'inset 0 0 0 1px #0f172a30, 0 0 0 1px #ffffff40' }}
        aria-label={`将便签颜色设为 ${preset}`} aria-pressed={preset.toLowerCase() === color.toLowerCase()} />)}
    </div>
    <div className="flex items-center gap-2">
      <input type="color" aria-label="自定义便签背景颜色" value={color} onChange={e => { setHexDraft(null); setInvalid(false); update({ color: e.target.value }) }} className="h-8 w-9 shrink-0 cursor-pointer rounded bg-transparent" />
      <input type="text" aria-label="便签背景色值" aria-invalid={invalid} value={hexDraft ?? color.toUpperCase()} maxLength={7} spellCheck={false}
        onChange={e => { setHexDraft(e.target.value); setInvalid(false) }} onBlur={applyHex}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyHex() } }}
        className="min-w-0 w-full rounded border border-current/20 bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-current/50" />
    </div>
    {invalid && <p className="text-[10px] text-red-400" role="alert">请输入六位色值，如 #EE7548</p>}
    <label className="flex items-center justify-between gap-2">背景透明度<span className="tabular-nums">{transparency}%</span></label>
    <input type="range" aria-label="便签背景透明度" aria-valuetext={`${transparency}% 透明`} min={0} max={90} step={1} value={transparency}
      onChange={e => update({ backgroundOpacity: (100 - Number(e.target.value)) / 100 })} className="w-full accent-orange-500" />
    <div className="flex justify-between text-[10px] opacity-55"><span>不透明</span><span>更透明</span></div>
    <button type="button" onClick={() => update({ backgroundOpacity: null })} className="min-h-7 w-full rounded border border-current/15 px-2 py-1 text-[11px] hover:bg-white/10">{note.backgroundOpacity == null ? '已跟随全局透明度' : '恢复跟随全局透明度'}</button>
    <p className="text-[10px] leading-relaxed opacity-50">仅调整这张便签的背景，文字保持清晰。</p>
  </div>
}
