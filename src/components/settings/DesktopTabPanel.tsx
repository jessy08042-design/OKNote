import { useEffect, useRef, useState } from 'react'
import type { DesktopTabSettings } from '@/types/electron'
import { desktopTabDefaults, tabStyle } from '@/components/windows/DesktopTabWindow'

export function DesktopTabPanel() {
  const [s, set] = useState(desktopTabDefaults)
  const composing = useRef(false)
  useEffect(() => {
    const apply = (all: { desktopTab: DesktopTabSettings }) => { if (all.desktopTab) set(all.desktopTab) }
    const clean = window.electronAPI?.onSettingsChanged(apply)
    window.electronAPI?.getSettings().then(apply)
    return clean
  }, [])
  const update = <K extends keyof DesktopTabSettings>(key: K, value: DesktopTabSettings[K]) => {
    set(old => ({ ...old, [key]: value }))
    window.electronAPI?.setSetting('desktopTab', key, value)
  }
  const toggle = (key: 'enabled' | 'alwaysOnTop' | 'locked', label: string) => <label className="flex items-center justify-between gap-3 py-2 text-sm">
    {label}<input type="checkbox" role="switch" aria-label={label} checked={s[key]} onChange={e => update(key, e.target.checked)} className="h-4 w-4 accent-orange-500" />
  </label>
  return <section className="mb-5 rounded-xl border border-current/10 p-4" aria-label="桌面标签设置">
    {toggle('enabled', '桌面标签模式')}
    <p className="mb-4 text-xs opacity-60">平时只显示侧边标签，点击展开日历。标签模式会暂停贴边自动收起。</p>
    <div className="mb-4 flex min-h-28 items-center justify-end rounded-lg bg-current/5 p-3" aria-label="标签外观预览">
      <div className="flex shrink-0 items-center justify-center overflow-hidden whitespace-nowrap px-2 select-none" style={{ ...tabStyle(s), width: s.width, height: s.height }}><span className="truncate">{s.label || '日历'}</span></div>
    </div>
    <div className="space-y-3 text-xs">
      <label className="flex items-center justify-between gap-3">标签文字（最多 4 字）<input aria-label="标签文字" value={s.label}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={e => { composing.current = false; const label = Array.from(e.currentTarget.value).slice(0, 4).join(''); if (label.trim()) update('label', label) }}
        onChange={e => { const label = composing.current ? e.target.value : Array.from(e.target.value).slice(0, 4).join(''); set(old => ({ ...old, label })); if (!composing.current && label.trim()) window.electronAPI?.setSetting('desktopTab', 'label', label) }} onBlur={() => { if (!s.label.trim()) update('label', '日历') }} className="w-28 rounded border border-current/20 bg-transparent px-2 py-1.5" /></label>
      {(['backgroundColor', 'textColor'] as const).map(key => <label key={key} className="flex items-center justify-between gap-3">{key === 'backgroundColor' ? '背景颜色' : '文字颜色'}<span className="flex items-center gap-2"><span className="font-mono opacity-60">{s[key].toUpperCase()}</span><input aria-label={key === 'backgroundColor' ? '标签背景颜色' : '标签文字颜色'} type="color" value={s[key]} onChange={e => update(key, e.target.value)} className="h-8 w-10 cursor-pointer rounded bg-transparent" /></span></label>)}
      {([
        ['opacity', '背景不透明度', 0.2, 1, 0.05], ['width', '标签宽度', 56, 160, 1], ['height', '标签高度', 36, 100, 1], ['radius', '圆角大小', 0, 40, 1], ['fontSize', '文字大小', 12, 28, 1],
      ] as const).map(([key, label, min, max, step]) => <label key={key} className="flex items-center justify-between gap-3">{label}<span className="flex items-center gap-2"><input aria-label={label} type="range" min={min} max={max} step={step} value={s[key]} onChange={e => update(key, Number(e.target.value))} className="w-28 accent-orange-500" /><span className="w-12 text-right tabular-nums opacity-60">{key === 'opacity' ? `${Math.round(s[key] * 100)}%` : `${s[key]}px`}</span></span></label>)}
      <label className="flex items-center justify-between gap-3">吸附方向<select aria-label="标签吸附方向" value={s.side} onChange={e => update('side', e.target.value as 'left' | 'right')} className="rounded border border-current/20 bg-[var(--settings-panel)] px-2 py-1.5"><option value="left">屏幕左侧</option><option value="right">屏幕右侧</option></select></label>
      {toggle('alwaysOnTop', '标签始终置顶')}
      {toggle('locked', '锁定标签位置')}
      <p className="text-xs leading-relaxed opacity-60">拖动标签可调整位置，松开后吸附左右边缘。默认可被其他应用遮挡；打开置顶后保持可见。</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="button" className="rounded border border-current/20 px-3 py-2 hover:bg-current/5" onClick={() => window.electronAPI?.desktopTabAction('reset')}>重置位置</button>
        <button type="button" className="rounded border border-current/20 px-3 py-2 hover:bg-current/5" onClick={() => { for (const key of ['backgroundColor', 'textColor', 'opacity', 'width', 'height', 'radius', 'fontSize'] as const) update(key, desktopTabDefaults[key]) }}>恢复默认外观</button>
      </div>
    </div>
  </section>
}
