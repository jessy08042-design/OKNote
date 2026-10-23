const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { startSession, waitUntil, click, fill } = require('./lib/electron-qa-session.cjs');
const { delay, allocatePort, waitForPage, DevToolsClient, stopChild } = require('./lib/electron-test-driver.cjs');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const data = path.join(root, 'test-results', 'desktop-tab', `profile-${Date.now()}`);
const output = path.join(root, 'test-results', 'desktop-tab');
const executable = path.join(root, 'node_modules/electron/dist/electron.exe');
async function run() {
  fs.mkdirSync(data, { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  let session;
  try {
    session = await startSession(root, executable, data);
    const cal = session.calendar;
    await cal.evaluate(`document.documentElement.dataset.tabQa = 'preserved'; window.electronAPI.openSettings();`);
    const settings = await session.page('#/settings');
    await click(settings, 'button', '日历');
    await waitUntil(() => settings.evaluate(`return !!document.querySelector('[aria-label="桌面标签模式"]');`), 'tab controls');
    await click(settings, '[aria-label="桌面标签模式"]');
    const tab = await session.page('#/desktop-tab');
    await waitUntil(() => tab.evaluate(`return document.querySelector('button')?.textContent === '日历';`), 'tab label');
    await waitUntil(() => cal.evaluate(`return document.hidden;`), 'calendar hidden');
    await fill(settings, '[aria-label="标签文字"]', '待办');
    await fill(settings, '[aria-label="标签背景颜色"]', '#327a65');
    await fill(settings, '[aria-label="标签文字颜色"]', '#fff1d6');
    await fill(settings, '[aria-label="标签宽度"]', '110');
    await delay(300);
    await waitUntil(() => tab.evaluate(`const b=document.querySelector('button'); return b.textContent==='待办' && getComputedStyle(b).backgroundColor==='rgb(50, 122, 101)' && Math.abs(innerWidth-110)<=1;`), 'live custom appearance');
    await click(tab, 'button');
    await waitUntil(() => cal.evaluate(`return !document.hidden;`), 'click opens calendar');
    assert.equal(await cal.evaluate(`return document.documentElement.dataset.tabQa;`), 'preserved');
    await cal.evaluate(`window.electronAPI.closeWindow();`);
    await waitUntil(() => cal.evaluate(`return document.hidden;`), 'close collapses instead of destroying');
    await click(tab, 'button');
    await waitUntil(() => cal.evaluate(`return !document.hidden;`), 'reopen calendar');
    await click(tab, 'button');
    await waitUntil(() => cal.evaluate(`return document.hidden;`), 'second click collapses');
    await tab.call('Page.bringToFront');
    const shot = await tab.call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, 'desktop-tab-preview.png'), Buffer.from(shot.data, 'base64'));
    await settings.call('Page.bringToFront');
    const settingsShot = await settings.call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, 'desktop-tab-settings.png'), Buffer.from(settingsShot.data, 'base64'));
    await delay(300);
    assert.equal(JSON.parse(fs.readFileSync(path.join(data, 'settings.json'))).desktopTab.backgroundColor, '#327a65');
    assert.deepEqual(session.errors, []);
    await session.stop(); session = null;
    // Cold launch must show only the saved tab, with no calendar renderer.
    const port = await allocatePort();
    const child = spawn(executable, ['.', `--remote-debugging-port=${port}`], { cwd: root, env: { ...process.env, OKNOTE_DATA_DIR: data, OKNOTE_E2E_TEST: '1', NODE_ENV: 'production' }, windowsHide: true, stdio: 'ignore' });
    let client;
    try {
      const page = await waitForPage(port, '#/desktop-tab');
      client = new DevToolsClient(page.webSocketDebuggerUrl); await client.connect();
      await waitUntil(() => client.evaluate(`return document.querySelector('button')?.textContent==='待办';`), 'saved tab after restart');
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      assert.equal(pages.some(p => p.url.includes('#/calendar')), false);
      await client.evaluate(`window.electronAPI.setSetting('desktopTab','enabled',false);`);
      await waitForPage(port, '#/calendar');
      console.log('PASS live label/color/size settings, click toggle, close-to-hide, preserved renderer, settings persistence, tab-only cold start, disabling restores calendar');
    } finally { client?.close(); await stopChild(child); }
  } finally { if (session) { console.log(session.diagnostics()); await session.stop(); } }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
