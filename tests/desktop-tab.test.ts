import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
const { defaults, normalize, sanitize, boundsFor, createDesktopTab } = createRequire(import.meta.url)('../electron/desktop-tab.cjs')

describe('desktop tab settings and window lifecycle', () => {
  it('loads legacy defaults and rejects malformed appearance data', () => {
    expect(normalize(undefined)).toEqual(defaults)
    expect(normalize({ backgroundColor: 'red', label: ' ', width: Infinity })).toEqual(defaults)
    expect(sanitize('__proto__', {})).toBeUndefined()
    expect(sanitize('backgroundColor', '#fff')).toBeUndefined()
    expect(sanitize('opacity', 0)).toBe(0.2)
    expect(sanitize('label', '我的每日待办')).toBe('我的每日')
    expect(normalize({ textColor: '#123456', width: 99, enabled: true })).toMatchObject({ textColor: '#123456', width: 99, enabled: true })
  })
  it('keeps either edge visible on scaled, small and negative-coordinate displays', () => {
    expect(boundsFor({ ...defaults, side: 'left', ratio: 1 }, { x: -1280, y: -100, width: 1280, height: 720 })).toEqual({ x: -1280, y: 564, width: 84, height: 56 })
    expect(boundsFor(defaults, { x: 0, y: 0, width: 60, height: 40 })).toEqual({ x: 0, y: 0, width: 60, height: 40 })
  })
  it('reuses a single tab, toggles the calendar, updates styling and recovers a removed display', () => {
    const windows: any[] = []
    class Window extends EventEmitter {
      webContents = { send: vi.fn() }; destroyed = false; bounds: any; top = false
      constructor(options: any) { super(); this.bounds = options; windows.push(this) }
      loadURL() {} showInactive() {} setBounds(b: any) { this.bounds = b }
      getBounds() { return this.bounds }
      setPosition(x: number, y: number) { this.bounds = { ...this.bounds, x, y } }
      setAlwaysOnTop(v: boolean) { this.top = v }
      isDestroyed() { return this.destroyed }
      destroy() { this.destroyed = true; this.emit('closed') }
    }
    const settings = { ...defaults, enabled: true, displayId: 7 }
    let cursor = { x: 950, y: 300 }
    const display = { id: 1, workArea: { x: 0, y: 0, width: 1000, height: 800 } }
    const screen = Object.assign(new EventEmitter(), { getAllDisplays: () => [display], getPrimaryDisplay: () => display, getCursorScreenPoint: () => cursor, getDisplayMatching: () => display })
    let visible = false
    const show = vi.fn(() => { visible = true }), hide = vi.fn(() => { visible = false })
    const controller = createDesktopTab({ BrowserWindow: Window, screen, Menu: {}, getSettings: () => settings, commit: vi.fn(), windowOptions: {}, loadURL: 'file://test', harden: vi.fn(), getCalendar: () => ({ isDestroyed: () => false, isVisible: () => visible }), showCalendar: show, hideCalendar: hide, openSettings: vi.fn() })
    controller.sync(); controller.sync()
    expect(windows).toHaveLength(1)
    expect(windows[0].bounds.x).toBe(916)
    controller.action({}, 'toggle'); expect(show).not.toHaveBeenCalled()
    controller.action(windows[0].webContents, 'toggle'); expect(show).toHaveBeenCalledOnce()
    controller.action(windows[0].webContents, 'toggle'); expect(hide).toHaveBeenCalledOnce()
    settings.alwaysOnTop = true; controller.sync(); expect(windows[0].top).toBe(true)
    screen.emit('display-removed'); expect(windows[0].bounds.x).toBe(916)
    controller.action(windows[0].webContents, 'down')
    cursor = { x: 100, y: 500 }
    controller.action(windows[0].webContents, 'up')
    expect(settings.side).toBe('left')
    expect(windows[0].bounds.x).toBe(0)
    expect(show).toHaveBeenCalledOnce() // Dragging never opens the calendar.
    settings.locked = true
    controller.action(windows[0].webContents, 'down')
    cursor = { x: 950, y: 600 }
    controller.action(windows[0].webContents, 'up')
    expect(settings.side).toBe('left')
    settings.enabled = false; controller.sync(); expect(controller.getWindow()).toBeNull()
    settings.enabled = true; controller.sync(); expect(windows).toHaveLength(2)
    controller.dispose()
  })
})
