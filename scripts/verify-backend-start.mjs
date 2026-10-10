import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
for (const entry of ['server.api.js', 'dist/server.cjs']) {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, [entry], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'production', API_ONLY: 'true', PORT: String(port), JWT_SECRET: randomBytes(32).toString('hex'), VITALTRACK_NO_AUTOSTART: 'false', MYSQL_HOST: '127.0.0.1', MYSQL_PORT: '1', MYSQL_DATABASE: 'qa_unused', ALLOW_DEMO_AUTH: 'false', ALLOW_DEMO_DATA: 'false' } });
  let output = ''; child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
  const exited = new Promise(resolve => child.once('exit', resolve));
  try {
    let response;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null) throw new Error(`${entry} failed to start: ${output}`);
      try { response = await fetch(`http://127.0.0.1:${port}/api/ping`); break; } catch { await sleep(100); }
    }
    assert.ok(response, `${entry} did not become ready`); assert.equal(response.status, 200); assert.equal((await response.json()).success, true);
    const unauthorized = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(unauthorized.status, 401); assert.equal((await unauthorized.json()).success, false);
    const missing = await fetch(`http://127.0.0.1:${port}/api/does-not-exist`);
    assert.equal(missing.status, 404);
    console.log(`PASS: ${entry} starts in production API mode; ping 200, protected route 401, missing route 404. No database connection used.`);
  } finally { child.kill(); await exited; }
}
