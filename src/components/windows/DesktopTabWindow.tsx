import { useEffect, useState } from 'react'
import type { DesktopTabSettings } from '@/types/electron'

export const desktopTabDefaults: DesktopTabSettings = { enabled: false, label: '日历', backgroundColor: '#EE7548', textColor: '#FFFFFF', opacity: 1, width: 84, height: 56, radius: 16, fontSize: 16, alwaysOnTop: false, locked: false, side: 'right', ratio: 0.33, displayId: null }
export function tabStyle(s: DesktopTabSettings) {
  const color = s.backgroundColor.replace('#', '')
  return {
    backgroundColor: `rgba(${parseInt(color.slice(0, 2), 16)},${parseInt(color.slice(2, 4), 16)},${parseInt(color.slice(4, 6), 16)},${s.opacity})`,
    color: s.textColor, fontSize: s.fontSize,
    borderRadius: s.side === 'right' ? `${s.radius}px 0 0 ${s.radius}px` : `0 ${s.radius}px ${s.radius}px 0`,
  }
}
export function DesktopTabWindow() {
  const [settings, setSettings] = useState(desktopTabDefaults)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    document.documentElement.classList.add('electron-transparent')
    const apply = (s: { desktopTab: DesktopTabSettings }) => { setSettings(s.desktopTab); setReady(true) }
    const cleanup = window.electronAPI?.onSettingsChanged(apply)
    window.electronAPI?.getSettings().then(apply)
    return cleanup
  }, [])
  if (!ready) return null
  return <button type="button" aria-label="展开或收起日历" title="单击展开 / 收起日历 · 拖动调整位置 · 右键设置"
    className="h-screen w-screen overflow-hidden text-ellipsis whitespace-nowrap border-0 px-2 font-medium select-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white/80"
    style={{ ...tabStyle(settings), cursor: settings.locked ? 'pointer' : 'grab', touchAction: 'none' }}
    onPointerDown={e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); window.electronAPI?.desktopTabAction('down') }}
    onPointerUp={e => { if (e.button !== 0) return; window.electronAPI?.desktopTabAction('up'); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }}
    onPointerCancel={() => window.electronAPI?.desktopTabAction('cancel')}
    onClick={e => { if (e.detail === 0) window.electronAPI?.desktopTabAction('toggle') }}
    onContextMenu={e => { e.preventDefault(); window.electronAPI?.desktopTabAction('menu') }}>
    {settings.label}
  </button>
}
