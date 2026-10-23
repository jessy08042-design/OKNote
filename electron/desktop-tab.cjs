const { HEX_COLOR_RE } = require('./data-rules.cjs');
const defaults = Object.freeze({ enabled: false, label: '日历', backgroundColor: '#EE7548', textColor: '#FFFFFF', opacity: 1, width: 84, height: 56, radius: 16, fontSize: 16, alwaysOnTop: false, locked: false, side: 'right', ratio: 0.33, displayId: null });
const ranges = { opacity: [0.2, 1], width: [56, 160], height: [36, 100], radius: [0, 40], fontSize: [12, 28], ratio: [0, 1] };
function sanitize(key, value) {
  if (['enabled', 'alwaysOnTop', 'locked'].includes(key)) return typeof value === 'boolean' ? value : undefined;
  if (key === 'label') return typeof value === 'string' && value.trim() ? Array.from(value.trim()).slice(0, 4).join('') : undefined;
  if (key === 'backgroundColor' || key === 'textColor') return typeof value === 'string' && HEX_COLOR_RE.test(value) ? value : undefined;
  if (key === 'side') return ['left', 'right'].includes(value) ? value : undefined;
  if (key === 'displayId') return value === null || Number.isSafeInteger(value) ? value : undefined;
  if (Object.hasOwn(ranges, key) && typeof value === 'number' && Number.isFinite(value)) {
    const [min, max] = ranges[key];
    return Math.min(max, Math.max(min, value));
  }
}
function normalize(raw) {
  const result = { ...defaults };
  if (raw && typeof raw === 'object') for (const key of Object.keys(defaults)) {
    const value = sanitize(key, raw[key]);
    if (value !== undefined) result[key] = value;
  }
  return result;
}
function boundsFor(settings, area) {
  const width = Math.min(Math.round(settings.width), area.width);
  const height = Math.min(Math.round(settings.height), area.height);
  return { x: settings.side === 'left' ? area.x : area.x + area.width - width, y: area.y + Math.round((area.height - height) * settings.ratio), width, height };
}
function createDesktopTab({ BrowserWindow, screen, Menu, getSettings, commit, windowOptions, loadURL, harden, getCalendar, showCalendar, hideCalendar, openSettings }) {
  let win = null;
  let drag = null;
  const area = () => (screen.getAllDisplays().find(d => d.id === getSettings().displayId) || screen.getPrimaryDisplay()).workArea;
  const toggle = () => { const cal = getCalendar(); if (cal && !cal.isDestroyed() && cal.isVisible()) hideCalendar(); else showCalendar(); };
  function finish(cancel = false) {
    if (!drag) return;
    drag.sample?.();
    clearInterval(drag.timer);
    const moved = drag.moved;
    drag = null;
    if (!win || win.isDestroyed()) return;
    if (moved && !cancel) {
      const b = win.getBounds();
      const display = screen.getDisplayMatching(b);
      const a = display.workArea;
      Object.assign(getSettings(), { displayId: display.id, side: b.x + b.width / 2 < a.x + a.width / 2 ? 'left' : 'right', ratio: Math.max(0, Math.min(1, (b.y - a.y) / Math.max(1, a.height - b.height))) });
      commit();
    }
    sync();
    if (!moved && !cancel) toggle();
  }
  function start() {
    if (!win || drag) return;
    const cursor = screen.getCursorScreenPoint();
    const b = win.getBounds();
    drag = { cursor, bounds: b, moved: false, timer: null };
    drag.sample = () => {
      if (!drag || !win || win.isDestroyed()) return;
      const p = screen.getCursorScreenPoint();
      const dx = p.x - cursor.x, dy = p.y - cursor.y;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved && !getSettings().locked) win.setPosition(b.x + dx, b.y + dy);
    };
    drag.timer = setInterval(drag.sample, 16);
  }
  function sync() {
    const s = getSettings();
    if (!s.enabled) { finish(true); if (win) { win.destroy(); win = null; } return; }
    if (!win) {
      win = new BrowserWindow({ ...windowOptions, ...boundsFor(s, area()), minWidth: 1, minHeight: 1, frame: false, transparent: true, resizable: false, skipTaskbar: true, hasShadow: false, show: false, title: 'OKNote 桌面标签', backgroundColor: '#00000000' });
      harden(win);
      win.loadURL(loadURL);
      win.once('ready-to-show', () => { if (win && !win.isDestroyed()) win.showInactive(); });
      win.on('closed', () => { if (drag) clearInterval(drag.timer); drag = null; win = null; });
    }
    if (!drag) win.setBounds(boundsFor(s, area()));
    win.setAlwaysOnTop(s.alwaysOnTop);
    win.webContents.send('desktop-tab-settings', s);
  }
  function action(sender, action) {
    if (action === 'reset' && sender !== win?.webContents) {
      Object.assign(getSettings(), { side: 'right', ratio: 0.33, displayId: null }); commit(); sync(); return;
    }
    if (sender !== win?.webContents) return;
    if (action === 'down') start();
    if (action === 'up') finish();
    if (action === 'cancel') finish(true);
    if (action === 'toggle') toggle();
    if (action === 'menu') Menu.buildFromTemplate([
      { label: '展开 / 收起日历', click: toggle },
      { label: '标签设置', click: openSettings },
      { label: '锁定位置', type: 'checkbox', checked: getSettings().locked, click: item => { getSettings().locked = item.checked; commit(); } },
    ]).popup({ window: win });
  }
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(event, () => { if (getSettings().enabled) sync(); });
  return { sync, action, getWindow: () => win, dispose: () => { if (drag) clearInterval(drag.timer); } };
}
module.exports = { defaults, sanitize, normalize, boundsFor, createDesktopTab };
