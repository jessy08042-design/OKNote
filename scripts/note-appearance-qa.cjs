const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { startSession, waitUntil, click, fill } = require('./lib/electron-qa-session.cjs');
const root = path.resolve(__dirname, '..');
const executable = require('electron');
const profile = path.join(root, 'test-results', 'note-appearance', `profile-${Date.now()}`);
const storage = path.join(profile, 'data');
const output = path.join(root, 'test-results', 'note-appearance');
const id = 'appearance_qa';
const api = (page, method, ...args) => page.evaluate(`return await window.electronAPI.${method}(${args.map(JSON.stringify).join(',')});`);
const saved = () => JSON.parse(fs.readFileSync(path.join(storage, `note_${id}.json`), 'utf8'));
async function run() {
  fs.mkdirSync(storage, { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  const ts = new Date().toISOString();
  fs.writeFileSync(path.join(storage, `note_${id}.json`), JSON.stringify({ id, title: '便签外观测试', noteType: 'independent', color: '#ee7548', isHidden: true, items: [{ id: 'item', noteId: id, content: '已保存的待办内容', sortOrder: 0, isCompleted: false }], createdAt: ts, updatedAt: ts }));
  let session;
  try {
    session = await startSession(root, executable, profile);
    const cal = session.calendar;
    await api(cal, 'setSetting', 'calendar', 'edgeAutoHide', false);
    await api(cal, 'showNote', id);
    const note = await session.page(`#/note/${id}`);
    await waitUntil(() => note.evaluate(`return !!document.querySelector('.note-window-root');`), 'note loaded');
    await click(note, '[aria-label="打开便签菜单"]');
    await fill(note, '[aria-label="自定义便签背景颜色"]', '#327a65');
    await fill(note, '[aria-label="便签背景透明度"]', '60');
    await waitUntil(() => saved().color === '#327a65' && saved().backgroundOpacity === 0.4, 'per-note appearance saved');
    await waitUntil(() => note.evaluate(`return document.querySelector('.note-window-root').style.getPropertyValue('--note-shell').toLowerCase()==='#327a6566';`), 'independent note appearance');
    // Changing the default must not override a customized note.
    await api(cal, 'setSetting', 'notes', 'backgroundOpacity', 0.75);
    await waitUntil(() => note.evaluate(`return document.querySelector('[aria-label="便签背景透明度"]').value==='60';`), 'local opacity overrides global');
    await fill(note, '[aria-label="便签背景色值"]', '#123456');
    await note.evaluate(`document.querySelector('[aria-label="便签背景色值"]').blur();`);
    await waitUntil(() => saved().color === '#123456', 'hex input saved');
    const shot = await note.call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, 'note-appearance-preview.png'), Buffer.from(shot.data, 'base64'));
    await api(note, 'dockNote', id, saved());
    await waitUntil(() => cal.evaluate(`return !!document.querySelector('[data-note-id="${id}"]');`), 'docked note restored');
    assert.equal(await cal.evaluate(`return document.querySelector('[data-note-id="${id}"]').style.getPropertyValue('--note-shell').toLowerCase();`), '#12345666');
    await click(cal, `[data-note-id="${id}"] [aria-label="打开便签菜单"]`);
    await fill(cal, '[aria-label="便签背景透明度"]', '30');
    await waitUntil(() => saved().backgroundOpacity === 0.7, 'docked opacity saved');
    await click(cal, 'button', '恢复跟随全局透明度');
    await waitUntil(() => saved().backgroundOpacity === null, 'reset persisted');
    await waitUntil(() => cal.evaluate(`return document.querySelector('[aria-label="便签背景透明度"]').value==='25';`), 'inherits 75% global opacity');
    await fill(cal, '[aria-label="便签背景透明度"]', '45');
    await waitUntil(() => saved().backgroundOpacity === 0.55, 'final opacity persisted');
    assert.equal(saved().items[0].content, '已保存的待办内容');
    assert.deepEqual(session.errors, []);
    await session.stop(); session = null;
    session = await startSession(root, executable, profile);
    await waitUntil(() => session.calendar.evaluate(`return document.querySelector('[data-note-id="${id}"]')?.style.getPropertyValue('--note-shell').toLowerCase()==='#1234568c';`), 'cold restart retains color and opacity');
    assert.deepEqual(session.errors, []);
    console.log('PASS custom color, hex input, per-note transparency, global fallback/reset, dock/undock appearance, content preservation, cold restart');
  } finally { if (session) { if (session.errors.length) console.error(session.errors); await session.stop(); } }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
