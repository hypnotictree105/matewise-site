import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {cleanEvent, FunnelStats} from '../server/analytics.js';
import worker from '../dist/server/index.js';

// Stand-in for a SQLite-backed Durable Object's ctx.storage.sql, using Node's built-in SQLite.
function fakeCtx() {
  const db = new DatabaseSync(':memory:');
  return {storage: {sql: {exec(q, ...b) {
    const st = db.prepare(q);
    const rows = /^\s*select/i.test(q) ? st.all(...b) : (q.trim().startsWith('CREATE') ? db.exec(q) : st.run(...b), []);
    return {toArray: () => rows};
  }}}};
}
// Stand-in for the ANALYTICS namespace binding, routing to one shared FunnelStats instance.
function fakeBinding(stats) {
  return {idFromName: () => 'global', get: () => ({fetch: (url, init) => stats.fetch(new Request(url, init))})};
}
const parts = new Set(['DT04-12P', 'DT06-12S']);
const sid = 'a1b2c3d4-0000-4000-8000-000000000001';

test('events are validated and personal or unknown data is dropped', () => {
  assert.equal(cleanEvent({sid: 'x', event: 'step', step: 1}, parts), null);
  assert.equal(cleanEvent({sid, event: 'hack', step: 1}, parts), null);
  assert.equal(cleanEvent({sid, event: 'step', step: 9}, parts), null);
  const e = cleanEvent({sid, event: 'bom', step: 6, email: 'a@b.com', request: {family: 'DT', scope: 'pair', connection: 'cables', mount: 'any', builds: 3,
    wires: [[10, 18, 'signal'], ['x', 18, 'power'], [1, 99, 'power']], parts: ['DT04-12P', 'DT06-12S', 'EVIL<script>'], notes: 'free text'}}, parts);
  assert.deepEqual(Object.keys(e).sort(), ['event', 'request', 'sid', 'step']);
  assert.deepEqual(e.request.wires, [[10, 18, 'signal']]);
  assert.deepEqual(e.request.parts, ['DT04-12P', 'DT06-12S']);
  assert.equal(e.request.notes, undefined);
});

test('visits record furthest step, where they left and what they built', () => {
  const stats = new FunnelStats(fakeCtx()), now = Date.UTC(2026, 9, 9, 12);
  for (let step = 0; step <= 6; step++) stats.record({sid, event: step === 6 ? 'bom' : 'step', step,
    ...(step === 6 ? {request: {family: 'DT', scope: 'pair', connection: 'cables', mount: 'any', builds: 2, wires: [[10, 18, 'signal']], parts: ['DT04-12P', 'DT06-12S']}} : {})}, now);
  stats.record({sid, event: 'csv', step: 6}, now);
  const quitter = 'a1b2c3d4-0000-4000-8000-000000000002';
  stats.record({sid: quitter, event: 'view', step: 0}, now);
  stats.record({sid: quitter, event: 'step', step: 2}, now);
  stats.record({sid: quitter, event: 'step', step: 1}, now);
  const s = stats.summary(30, now);
  assert.equal(s.totals.visits, 2);
  assert.equal(s.totals.boms, 1);
  assert.equal(s.totals.csv, 1);
  assert.deepEqual(s.reached, [2, 2, 2, 1, 1, 1, 1]);
  assert.equal(s.leftAt[1], 1); // the quitter went back to step 2 of 7 and closed the tab
  assert.equal(s.top.families[0].name, 'DT');
  assert.deepEqual(s.top.awg[0], {name: '18 AWG', count: 10});
  assert.equal(s.recent[0].downloaded, true);
  assert.equal(stats.summary(30, now + 40 * 86400000).totals.visits, 0);
});

test('event endpoint is same-site only and stats need the key', async () => {
  const stats = new FunnelStats(fakeCtx());
  const env = {ANALYTICS: fakeBinding(stats), STATS_KEY: 'correct-horse'};
  const post = origin => worker.fetch(new Request('https://usematewise.com/api/event', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'},
    body: JSON.stringify({sid, event: 'step', step: 3})}), env, {waitUntil: p => p});
  assert.equal((await post('https://evil.example')).status, 204);
  assert.equal(stats.summary(30).totals.visits, 0);
  assert.equal((await post('https://usematewise.com')).status, 204);
  await new Promise(r => setTimeout(r, 10));
  assert.equal(stats.summary(30).totals.visits, 1);
  const get = auth => worker.fetch(new Request('https://usematewise.com/api/stats?days=7', {headers: auth ? {Authorization: 'Bearer ' + auth} : {}}), env);
  assert.equal((await get()).status, 401);
  assert.equal((await get('wrong-horse!!')).status, 401);
  const ok = await get('correct-horse');
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).reached[3], 1);
  assert.equal((await worker.fetch(new Request('https://usematewise.com/api/stats'), {ANALYTICS: env.ANALYTICS})).status, 503);
  const page = await worker.fetch(new Request('https://usematewise.com/stats'), {});
  assert.equal(page.status, 200);
  assert.match(await page.text(), /noindex/);
});
