// Browser checks use an isolated SQL double and the installed Edge in headless mode.
// No .env, cloud database, real Gemini service or Bluetooth device is used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, stat, mkdir } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';
import jwt from 'jsonwebtoken';
import { MemoryPool } from './support/memory-pool.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const directory = await mkdtemp(join(tmpdir(), 'vitaltrack-browser-'));
const executable = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const edge = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${directory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let frontend, backend, socket;
try {
  let port;
  for (let i = 0; i < 100; i++) { try { port = Number((await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await sleep(100); } }
  if (!port) throw new Error('Headless Edge did not expose DevToolsActivePort.');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let next = 0; const pending = new Map(), exceptions = [];
  socket.addEventListener('message', e => {
    const message = JSON.parse(e.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (message.error) p.reject(new Error(message.error.message)); else p.resolve(message.result); }
  });
  socket.addEventListener('close', e => { for (const p of pending.values()) p.reject(new Error(`DevTools closed: ${e.code}`)); pending.clear(); });
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++next; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`DevTools timed out: ${method}`)); }, 10000); pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const evaluate = async (expression, sessionId) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await command('Page.enable'); await command('Runtime.enable');
  if (process.argv.includes('--favicon-only')) {
    const svg = await readFile('public/favicon.svg', 'utf8');
    await command('Emulation.setDeviceMetricsOverride', { width: 64, height: 64, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.body.style.margin='0';document.body.innerHTML=${JSON.stringify(svg)};`);
    const shot = await command('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 64, height: 64, scale: 1 } });
    await writeFile('public/favicon.png', Buffer.from(shot.data, 'base64'));
    console.log('Created 64×64 PNG fallback from the existing VitalTrack SVG mark.');
  } else {
    process.env.VITALTRACK_NO_AUTOSTART = 'true'; process.env.JWT_SECRET = 'isolated-browser-secret'; delete process.env.GEMINI_API_KEY;
    const { startServer } = await import('../server.js');
    const pool = new MemoryPool();
    pool.tables.users[0].primary_doctor = 'QA existing clinician';
    pool.tables.users[0].medical_notes = 'Keep this existing note';
    pool.tables.health_records.push({ id: 1, user_id: 1, weight: '68.50', systolic: 118, diastolic: 76, heart_rate: 72, notes: 'QA note', recorded_at: new Date(Date.now() - 3600000).toISOString(), created_at: new Date(Date.now() - 3500000).toISOString() });
    const app = await startServer({ pool, listen: false, apiOnly: true });
    backend = app.listen(0, '127.0.0.1'); await new Promise(resolve => backend.once('listening', resolve));
    const apiBase = `http://127.0.0.1:${backend.address().port}`, root = resolve(process.env.VITALTRACK_SMOKE_DIR || 'build/qa-client');
    const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png' };
    let failingHealth = false;
    frontend = createServer(async (req, res) => {
      try {
        if (req.url.startsWith('/api/')) {
          if (failingHealth && req.url.startsWith('/api/health')) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false, message: 'QA: health temporarily unavailable' })); return; }
          const chunks = []; for await (const chunk of req) chunks.push(chunk);
          const response = await fetch(apiBase + req.url, { method: req.method, headers: { ...req.headers, host: new URL(apiBase).host }, ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}) });
          res.writeHead(response.status, { 'Content-Type': 'application/json' }); res.end(await response.text()); return;
        }
        const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
        if (path !== root && !path.startsWith(root + '\\') && !path.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
        let file = path;
        try { if (!(await stat(file)).isFile()) file = join(root, 'index.html'); } catch { file = join(root, 'index.html'); }
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file));
      } catch (error) { res.writeHead(500); res.end(error.message); }
    }).listen(0, '127.0.0.1'); await new Promise(resolve => frontend.once('listening', resolve));
    const base = `http://127.0.0.1:${frontend.address().port}`;
    await mkdir('build/qa-artifacts', { recursive: true });
    const waitFor = async (expression, description, sessionId) => { for (let i = 0; i < 100; i++) { if (await evaluate(`!!document.body && (${expression})`, sessionId)) return; await sleep(80); } throw new Error(`Timeout: ${description}\n${exceptions.join('\n')}\n${await evaluate("document.body?.innerText.slice(-2200) || 'Document not ready'", sessionId)}`); };
    const navigate = async path => { await command('Page.navigate', { url: base + path }); await waitFor("document.querySelector('#root')?.innerText.length > 20", path); await sleep(400); };
    await navigate('/login');
    await evaluate(`localStorage.setItem('vitaltrack_token', ${JSON.stringify(jwt.sign({ id: 1 }, process.env.JWT_SECRET))});`);
    const noticeVisible = "[...document.querySelectorAll('[role=status]')].some(el => el.textContent.includes('Đến lịch:'))";
    const reminder = (id, extra = {}) => ({ id, user_id: 1, type: 'water', title: `QA reminder ${id}`, time_of_day: '00:00', is_active: 1, timezone: 'UTC', repeat_days: '[0,1,2,3,4,5,6]', completed_dates: '[]', ...extra });
    const reminderButton = (id, selector) => `[...document.querySelectorAll('p')].find(p => p.textContent === 'QA reminder ${id}').closest('.group').querySelector(${JSON.stringify(selector)}).click()`;
    const expectNoNotice = async description => {
      await waitFor(`!(${noticeVisible})`, description);
      assert.equal(exceptions.length, 0, exceptions.join('\n'));
      assert.ok(await evaluate("document.body.innerText.includes('VitalTrack')"), 'App remains mounted');
    };
    await navigate('/dashboard');
    await expectNoNotice('empty reminder list');
    pool.tables.reminders.push(reminder(1, { is_active: 0 }));
    await navigate('/reminders');
    await waitFor("document.body.innerText.includes('QA reminder 1')", 'disabled reminder renders without reading null notice.id');
    await expectNoNotice('disabled reminders do not display a notice');
    const now = new Date();
    pool.tables.reminders.push(
      reminder(2, { completed_dates: JSON.stringify([now.toISOString().slice(0, 10)]) }),
      reminder(3, { repeat_days: JSON.stringify([(now.getUTCDay() + 1) % 7]) }),
      reminder(4, { time_of_day: '23:59', timezone: now.getUTCHours() === 23 && now.getUTCMinutes() === 59 ? 'Etc/GMT+1' : 'UTC' }),
    );
    await navigate('/reminders');
    await waitFor("document.body.innerText.includes('QA reminder 4')", 'pending, completed and unscheduled reminders load');
    await expectNoNotice('no notification before its scheduled time or after completion');
    pool.tables.reminders.push(reminder(5));
    await navigate('/reminders');
    await waitFor(`(${noticeVisible}) && [...document.querySelectorAll('[role=status]')].some(el => el.textContent.includes('QA reminder 5'))`, 'due reminder appears');
    await evaluate("[...document.querySelectorAll('[role=status] button')].find(b => b.textContent.includes('Đã xem')).click()");
    await expectNoNotice('dismissal keeps the app mounted');
    await navigate('/dashboard');
    await expectNoNotice('dismissed reminder stays dismissed after reload');
    pool.tables.reminders.push(reminder(6));
    await navigate('/reminders');
    await waitFor(noticeVisible, 'new due reminder is not suppressed by an earlier dismissal');
    await evaluate("[...document.querySelectorAll('p')].find(p => p.textContent === 'QA reminder 6').closest('.group').querySelector('.text-xs button').click()");
    await waitFor("document.body.innerText.includes('Đã hoàn thành lịch hôm nay.')", 'backend confirms reminder completion');
    await expectNoNotice('completion removes the current reminder notice');
    assert.equal(JSON.parse(pool.tables.reminders.find(r => r.id === 6).completed_dates).length, 1);
    pool.tables.reminders.push(reminder(7));
    await navigate('/reminders');
    await waitFor(noticeVisible, 'due reminder before disabling');
    await evaluate(reminderButton(7, 'button'));
    await waitFor("document.body.innerText.includes('Đã tạm tắt nhắc nhở')", 'backend confirms disabled reminder');
    await expectNoNotice('disabling removes the current notice');
    assert.equal(pool.tables.reminders.find(r => r.id === 7).is_active, 0);
    pool.tables.reminders.push(reminder(8));
    await navigate('/reminders');
    await waitFor(noticeVisible, 'due reminder before deletion');
    await evaluate(reminderButton(8, 'button[title="Xóa"]'));
    await waitFor("!!document.querySelector('[role=dialog]')", 'delete confirmation');
    await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.includes('Xác nhận xóa')).click()");
    await waitFor("document.body.innerText.includes('Đã xóa nhắc nhở thành công.')", 'backend confirms deletion');
    await expectNoNotice('deleting removes the current notice');
    assert.ok(!pool.tables.reminders.some(r => r.id === 8));
    pool.tables.reminders.push(reminder(9));
    await navigate('/dashboard');
    await waitFor(noticeVisible, 'due reminder links to its existing feature');
    await evaluate("[...document.querySelectorAll('[role=status] a')].find(a => a.textContent.includes('Mở chức năng')).click()");
    await waitFor("location.pathname === '/reminders'", 'reminder link navigation');
    await expectNoNotice('opening a reminder also dismisses its notice');
    pool.tables.reminders = [reminder(1, { is_active: 0 })];
    console.log('PASS: reminder notices handle empty/disabled/pending/completed/unscheduled lists, due display, dismissal/reload, completion, disabling, deletion and navigation.');
    const paths = ['/dashboard', '/health', '/analytics', '/goals', '/reminders', '/devices', '/profile', '/ai-diagnostics'];
    for (const width of [390, 768, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      for (const path of paths) {
        await navigate(path);
        assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), `Horizontal overflow: ${path} ${width}`);
        assert.equal(exceptions.length, 0, exceptions.join('\n'));
        assert.ok(!(await evaluate('document.body.innerText.includes("Invalid Date")')), `Invalid Date: ${path}`);
        if (path === '/dashboard') {
          await waitFor("document.querySelectorAll('[data-chart-bar]').length > 0", 'chart receives recent measurements');
          assert.ok(await evaluate("[...document.querySelectorAll('[data-chart-bar]')].every(el => el.getBoundingClientRect().height > 10)"), `Visible chart bars at ${width}px`);
        }
      }
    }
    console.log('PASS: 8 user routes at 390/768/1440 px; no runtime exceptions or page overflow.');
    failingHealth = true;
    await navigate('/dashboard');
    await waitFor("document.body.innerText.includes('QA: health temporarily unavailable')", 'failed API is visible rather than a false empty success');
    assert.ok(await evaluate("document.body.innerText.includes('VitalTrack')"), 'API failure does not crash navigation');
    failingHealth = false;
    console.log('PASS: API failure displays an error and keeps the app usable.');
    await navigate('/health?record=1');
    await waitFor("!!document.querySelector('[role=dialog]')", 'record popup');
    assert.equal(await evaluate("[...document.querySelectorAll('[role=dialog] input[type=number]')].every(n => n.value === '')"), true, 'No fabricated default measurements');
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await waitFor("!document.querySelector('[role=dialog]')", 'Escape closes record modal');
    console.log('PASS: record deep link, empty numeric inputs and Escape keyboard dismissal.');
    await navigate('/goals');
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Tạo mục tiêu mới')).click()");
    await waitFor("!!document.querySelector('[role=dialog] input[type=number]') && document.querySelector('[role=dialog] input[type=number]').value === '68.5'", 'goal start value from latest measurement');
    console.log('PASS: new goal uses latest MySQL measurement as the starting value.');
    const unicodeTitle = 'Kiểm soát cân nặng tiêu chuẩn — 🫀';
    await evaluate(`(() => { const dialog = document.querySelector('[role=dialog]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; const title = dialog.querySelector('input[type=text]'); setter.call(title, ${JSON.stringify(unicodeTitle)}); title.dispatchEvent(new Event('input', { bubbles: true })); const target = dialog.querySelectorAll('input[type=number]')[2]; setter.call(target, '65'); target.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await evaluate("document.querySelector('[role=dialog] form').requestSubmit()");
    await waitFor("!document.querySelector('[role=dialog]')", 'backend confirms Unicode goal creation');
    assert.equal(pool.tables.goals.at(-1).title, unicodeTitle);
    await navigate('/dashboard');
    await waitFor(`document.body.innerText.includes(${JSON.stringify(unicodeTitle)})`, 'dashboard displays exact Vietnamese goal title after reload');
    await navigate('/goals');
    await waitFor(`document.body.innerText.includes(${JSON.stringify(unicodeTitle)})`, 'goal page preserves accents and four-byte Unicode');
    console.log('PASS: Vietnamese and four-byte Unicode survive real goal form submission, backend storage and dashboard/goal reload.');
    const secondTab = await command('Target.createTarget', { url: base + '/profile' });
    const secondSession = (await command('Target.attachToTarget', { targetId: secondTab.targetId, flatten: true })).sessionId;
    await command('Runtime.enable', {}, secondSession); await command('Page.enable', {}, secondSession);
    await waitFor("document.body.innerText.includes('68.5kg')", 'second tab reads original current weight', secondSession);
    await command('Page.bringToFront');
    await navigate('/health?record=1');
    await waitFor("!!document.querySelector('[role=dialog]')", 'measurement form');
    await evaluate(`(() => { const dialog = document.querySelector('[role=dialog]'); const nums = [...dialog.querySelectorAll('input[type=number]')]; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; [67.2, 72, 118, 76].forEach((value, i) => { setter.call(nums[i], String(value)); nums[i].dispatchEvent(new Event('input', { bubbles: true })); }); [...dialog.querySelectorAll('button')].find(b => b.textContent.includes('Đo vào buổi sáng')).click(); })()`);
    await evaluate("document.querySelector('[role=dialog] form').requestSubmit()");
    await waitFor("!document.querySelector('[role=dialog]')", 'backend confirms measurement before modal closes');
    assert.equal(pool.tables.health_records.at(-1).weight, 67.2);
    assert.ok(pool.tables.health_records.at(-1).notes.includes('buổi sáng'));
    await command('Page.bringToFront', {}, secondSession);
    await waitFor("document.body.innerText.includes('67.2kg')", 'storage event synchronizes already-open profile tab', secondSession);
    await command('Target.closeTarget', { targetId: secondTab.targetId });
    await command('Page.bringToFront');
    console.log('PASS: two browser tabs synchronize the confirmed measurement without a reload.');
    await navigate('/profile');
    await waitFor("document.body.innerText.includes('67.2kg')", 'profile reflects new measurement');
    console.log('PASS: real form submission, quick note persistence and profile weight synchronization.');
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await navigate('/dashboard');
    await writeFile('build/qa-artifacts/dashboard-mobile.png', Buffer.from((await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    await evaluate(`localStorage.setItem('vitaltrack_token', ${JSON.stringify(jwt.sign({ id: 3 }, process.env.JWT_SECRET))});sessionStorage.removeItem('vitaltrack_measure_prompt_3_seen');localStorage.removeItem('vitaltrack_measure_prompt_3');`);
    await navigate('/dashboard');
    await waitFor("!!document.querySelector('[aria-label=\"Lời nhắc ghi nhận sức khỏe\"]')", 'onboarding prompt for user with no health records');
    await evaluate("document.querySelector('[aria-label=\"Lời nhắc ghi nhận sức khỏe\"] button[aria-label]').click()");
    await navigate('/health');
    assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Lời nhắc ghi nhận sức khỏe\"]')"), false, 'prompt respects dismissal across route reloads');
    console.log('PASS: first-measurement reminder and dismissal persistence.');
    const analysis = await fetch(apiBase + '/api/ai/diagnose', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ id: 1 }, process.env.JWT_SECRET)}` }, body: JSON.stringify({ use_database: true, symptoms: [] }) });
    assert.equal(analysis.status, 200);
    await evaluate(`localStorage.setItem('vitaltrack_token', ${JSON.stringify(jwt.sign({ id: 2 }, process.env.JWT_SECRET))});`);
    await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const path of ['/admin', '/admin/users', '/admin/telemetry', '/admin/ai-reviews', '/admin/devices', '/admin/logs', '/admin/audit-logs', '/admin/settings']) {
      await navigate(path); assert.equal(exceptions.length, 0, `${path}: ${exceptions.join('\n')}`);
      assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Lời nhắc ghi nhận sức khỏe\"]')"), false, 'no user onboarding for admin');
      if (path === '/admin/users') {
        await waitFor("!!document.querySelector('button[title=\"Xem Y bạ\"]')", 'patient dossier action');
        await evaluate("document.querySelector('button[title=\"Xem Y bạ\"]').click()");
        await waitFor("!!document.querySelector('[role=dialog]') && document.querySelector('[role=dialog]').innerText.includes('Sinh tồn')", 'patient dossier response mapping');
        assert.equal(exceptions.length, 0, exceptions.join('\n'));
        await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
        await waitFor("!document.querySelector('[role=dialog]')", 'close dossier');
        await evaluate("[...document.querySelectorAll('tr')].find(row => row.innerText.includes('QA User')).querySelector('button[title=\"Sửa thông tin\"]').click()");
        await waitFor("[...document.querySelectorAll('[role=dialog] input')].some(input => input.value === 'QA existing clinician')", 'edit loads full existing medical profile');
        assert.ok(await evaluate("[...document.querySelectorAll('[role=dialog] input')].some(input => input.value === '170')"), 'existing height is preserved when editing summary-list account');
        await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent.includes('Lưu Thay Đổi')).click()");
        await waitFor("!document.querySelector('[role=dialog]')", 'admin profile update confirmed');
        assert.equal(pool.tables.users[0].primary_doctor, 'QA existing clinician'); assert.equal(pool.tables.users[0].medical_notes, 'Keep this existing note');
        assert.equal(pool.tables.users[0].base_weight_kg, 70); assert.equal(pool.tables.users[0].target_weight_kg, 65);
      }
      if (path === '/admin/ai-reviews') {
        await waitFor("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Thẩm Định Ca'))", 'AI reference history appears for admin');
        await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Thẩm Định Ca')).click()");
        await waitFor("!!document.querySelector('[role=dialog]') && document.querySelector('[role=dialog]').innerText.includes('Lưu Thẩm Định')", 'AI review opens with structured recommendations');
        assert.equal(exceptions.length, 0, exceptions.join('\n')); assert.ok(!(await evaluate("document.body.innerText.includes('NaN')")));
      }
    }
    console.log('PASS: 8 admin routes render with real Express API contracts and isolated data.');
    await evaluate(`localStorage.setItem('vitaltrack_token', ${JSON.stringify(jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -1 }))});`);
    await navigate('/dashboard');
    await waitFor("location.pathname === '/login'", 'expired JWT safely returns to login');
    console.log('PASS: expired JWT returns to login without crashing the app.');
    await writeFile(join(directory, 'result.txt'), 'Browser smoke checks passed.\n');
    console.log(`Browser artifacts: ${directory}`);
  }
} finally {
  socket?.close(); edge.kill();
  if (frontend) await new Promise(resolve => frontend.close(resolve));
  if (backend) await new Promise(resolve => backend.close(resolve));
}
