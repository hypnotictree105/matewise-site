// Anonymous funnel analytics. One row per browser-tab visit: how far it got and what it asked for.
// No names, emails, IP addresses, user agents or cookies are stored. Rows older than RETAIN_DAYS are deleted.
export const STEPS = 7;
export const EVENTS = ['view', 'step', 'bom', 'csv', 'print', 'stock', 'reference', 'reset', 'leave'];
const COUNTERS = {bom: 'bom', csv: 'csv', print: 'print', stock: 'stock', reference: 'reference', reset: 'resets'};
export const PATHS = ['guided', 'quick'];
const RETAIN_DAYS = 180;
const MAX_ROWS = 200000;
const DAY = 86400000;
const word = v => typeof v === 'string' && /^[a-z0-9-]{1,24}$/i.test(v) ? v : null;
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : null;

// Validates an incoming browser event. Anything unexpected is dropped rather than stored.
export function cleanEvent(body, allowedParts) {
  if (!body || typeof body !== 'object') return null;
  const sid = typeof body.sid === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(body.sid) ? body.sid : null;
  const event = EVENTS.includes(body.event) ? body.event : null;
  const step = int(body.step, 0, STEPS - 1);
  if (!sid || !event || step == null) return null;
  const out = {sid, event, step};
  if (PATHS.includes(body.path)) out.path = body.path;
  if (event === 'bom' && body.request && typeof body.request === 'object') {
    const r = body.request;
    const wires = Array.isArray(r.wires) ? r.wires.slice(0, 30).map(w => Array.isArray(w) ? [int(w[0], 1, 128), int(w[1], 12, 28), word(w[2])] : null)
      .filter(w => w && w.every(x => x != null)) : [];
    const parts = Array.isArray(r.parts) ? [...new Set(r.parts.filter(p => typeof p === 'string' && allowedParts.has(p)))].slice(0, 4) : [];
    out.request = {scope: word(r.scope), family: word(r.family), connection: word(r.connection), mount: word(r.mount), builds: int(r.builds, 1, 10000), wires, parts};
  }
  return out;
}

export function summarize(rows, now, days) {
  const reached = Array(STEPS).fill(0), leftAt = Array(STEPS).fill(0), daily = new Map();
  const tally = () => new Map(), families = tally(), awg = tally(), parts = tally(), mounts = tally();
  const bump = (m, k, n = 1) => k != null && m.set(k, (m.get(k) || 0) + n);
  let visits = 0, boms = 0, csv = 0, print = 0, stock = 0, reference = 0;
  const byPath = Object.fromEntries(PATHS.map(p => [p, {visits: 0, boms: 0, csv: 0}]));
  const recent = [];
  for (const r of rows) {
    visits++;
    const path = PATHS.includes(r.path) ? r.path : 'guided';
    const bp = byPath[path]; bp.visits++; if (r.bom) bp.boms++; if (r.csv) bp.csv++;
    // The step funnel describes the guided wizard; quick-entry visits are counted in byPath only.
    if (path === 'guided') {
      for (let i = 0; i <= r.max_step; i++) reached[i]++;
      if (!r.csv && !r.print) leftAt[r.last_step]++;
    }
    if (r.bom) boms++; if (r.csv) csv++; if (r.print) print++; if (r.stock) stock++; if (r.reference) reference++;
    const d = daily.get(r.day) || {day: r.day, visits: 0, boms: 0, downloads: 0};
    d.visits++; if (r.bom) d.boms++; if (r.csv) d.downloads++; daily.set(r.day, d);
    if (r.request) {
      let q; try { q = JSON.parse(r.request); } catch { continue; }
      bump(families, q.family); bump(mounts, q.mount);
      for (const [n, g] of q.wires || []) bump(awg, g + ' AWG', n);
      for (const p of q.parts || []) bump(parts, p);
      if (recent.length < 25) recent.push({at: new Date(r.last_ts).toISOString(), downloaded: !!r.csv, path, ...q});
    }
  }
  const top = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({name, count}));
  return {
    days, generatedAt: new Date(now).toISOString(),
    totals: {visits, boms, csv, print, stock, reference},
    reached, leftAt, byPath,
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
    top: {families: top(families), awg: top(awg), parts: top(parts), mounts: top(mounts)},
    recent
  };
}

export class FunnelStats {
  constructor(ctx) {
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS visits(
      sid TEXT PRIMARY KEY, day TEXT NOT NULL, first_ts INTEGER NOT NULL, last_ts INTEGER NOT NULL,
      max_step INTEGER NOT NULL DEFAULT 0, last_step INTEGER NOT NULL DEFAULT 0,
      bom INTEGER NOT NULL DEFAULT 0, csv INTEGER NOT NULL DEFAULT 0, print INTEGER NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0, reference INTEGER NOT NULL DEFAULT 0, resets INTEGER NOT NULL DEFAULT 0,
      request TEXT)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS visits_last ON visits(last_ts)');
    // Added after launch: which path (guided wizard or quick entry) the visit used last.
    if (!this.sql.exec('PRAGMA table_info(visits)').toArray().some(c => c.name === 'path')) this.sql.exec('ALTER TABLE visits ADD COLUMN path TEXT');
  }
  record(e, now = Date.now()) {
    const exists = this.sql.exec('SELECT 1 FROM visits WHERE sid = ?', e.sid).toArray().length > 0;
    if (!exists) {
      if (Math.random() < 0.01) this.sql.exec('DELETE FROM visits WHERE last_ts < ?', now - RETAIN_DAYS * DAY);
      if (this.sql.exec('SELECT COUNT(*) AS n FROM visits').toArray()[0].n >= MAX_ROWS) return false;
      this.sql.exec('INSERT INTO visits(sid, day, first_ts, last_ts) VALUES(?, ?, ?, ?)', e.sid, new Date(now).toISOString().slice(0, 10), now, now);
    }
    this.sql.exec('UPDATE visits SET last_ts = ?, max_step = MAX(max_step, ?), last_step = ? WHERE sid = ?', now, e.step, e.step, e.sid);
    const column = COUNTERS[e.event];
    if (column) this.sql.exec(`UPDATE visits SET ${column} = ${column} + 1 WHERE sid = ?`, e.sid);
    if (e.path) this.sql.exec('UPDATE visits SET path = ? WHERE sid = ?', e.path, e.sid);
    if (e.request) this.sql.exec('UPDATE visits SET request = ? WHERE sid = ?', JSON.stringify(e.request), e.sid);
    return true;
  }
  summary(days, now = Date.now()) {
    const rows = this.sql.exec('SELECT * FROM visits WHERE first_ts >= ? ORDER BY last_ts DESC', now - days * DAY).toArray();
    return summarize(rows, now, days);
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/record' && request.method === 'POST') return Response.json({ok: this.record(await request.json())});
    if (url.pathname === '/summary') return Response.json(this.summary(Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30))));
    return new Response('Not found', {status: 404});
  }
}
