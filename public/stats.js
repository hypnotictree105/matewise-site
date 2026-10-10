const STEPS = ['The connection', 'Your wires', 'The environment', 'Mounting & fit', 'Connector choices', 'Finish the ends', 'Your parts list'];
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pct = (n, d) => d ? Math.round(100 * n / d) + '%' : '–';
const store = {get() { try { return localStorage.getItem('mw-stats-key') || ''; } catch { return ''; } }, set(v) { try { v ? localStorage.setItem('mw-stats-key', v) : localStorage.removeItem('mw-stats-key'); } catch {} }};
let key = store.get();

async function load() {
  $('error').textContent = '';
  const res = await fetch('/api/stats?days=' + $('days').value, {headers: {Authorization: 'Bearer ' + key}, cache: 'no-store'}).catch(() => null);
  const body = res ? await res.json().catch(() => ({})) : {};
  if (!res || !res.ok) { showLogin(body.error || 'Could not load stats.'); return; }
  $('login').classList.add('hidden'); $('controls').classList.remove('hidden'); $('report').classList.remove('hidden');
  $('report').innerHTML = render(body);
}
function showLogin(message) {
  $('report').classList.add('hidden'); $('login').classList.remove('hidden'); $('controls').classList.add('hidden');
  $('error').textContent = message || '';
}
function bar(label, n, total, left, title) {
  const w = total && n ? Math.max(0.5, 100 * n / total) : 0;
  return `<div>${esc(label)}</div><div class="track" title="${esc(title)}" role="img" aria-label="${esc(title)}"><div class="fill" style="width:${w}%"></div></div><div class="num">${n}</div><div class="num left">${left ?? ''}</div>`;
}
function list(title, rows) {
  return `<div><h2>${esc(title)}</h2>${rows.length ? `<table><tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td class="n">${r.count}</td></tr>`).join('')}</tbody></table>` : '<p class="note">No data yet.</p>'}</div>`;
}
function render(d) {
  const t = d.totals, v = t.visits;
  const tiles = [['Visits', v], ['Built a BOM', t.boms, pct(t.boms, v)], ['Downloaded CSV', t.csv, pct(t.csv, v)], ['Checked stock', t.stock, pct(t.stock, v)]]
    .map(([l, n, p]) => `<div class="tile"><b>${n}</b><span>${esc(l)}${p ? ' · ' + p : ''}</span></div>`).join('');
  const funnel = STEPS.map((s, i) => bar(`${i + 1}. ${s}`, d.reached[i], v, d.leftAt[i] || '', `${d.reached[i]} of ${v} visits reached step ${i + 1} (${pct(d.reached[i], v)}); ${d.leftAt[i]} stopped here`)).join('')
    + '<div class="sep"></div>'
    + [['Downloaded CSV', t.csv], ['Printed / PDF', t.print], ['Checked stock', t.stock], ['Opened reference example', t.reference]]
      .map(([l, n]) => bar(l, n, v, '', `${n} of ${v} visits (${pct(n, v)})`)).join('');
  const daily = d.daily.slice().reverse().map(r => `<tr><td>${esc(r.day)}</td><td class="n">${r.visits}</td><td class="n">${r.boms}</td><td class="n">${r.downloads}</td></tr>`).join('');
  const recent = d.recent.map(r => `<tr><td>${esc(r.at.slice(0, 16).replace('T', ' '))}</td><td>${esc(r.family)} · ${esc(r.scope)} · ${esc(r.connection)}${r.mount && r.mount !== 'any' ? ' · ' + esc(r.mount) : ''}</td><td>${(r.wires || []).map(w => `${w[0]}×${w[1]} AWG ${esc(w[2])}`).join(', ')}</td><td>${(r.parts || []).map(esc).join(' + ') || '–'}</td><td class="n">${r.builds ?? ''}</td><td>${r.downloaded ? 'Yes' : ''}</td></tr>`).join('');
  return `<div class="tiles">${tiles}</div>
<section class="card"><h2>How far visits got</h2><div class="funnel"><div class="head">Step</div><div class="head">Reached</div><div class="head num">Visits</div><div class="head num left">Left here</div>${funnel}</div>
<p class="note">"Left here" is the last step a visit was on before closing the tab, for visits that didn't download or print a BOM. Visitors with Do Not Track or Global Privacy Control turned on aren't counted.</p></section>
<section class="card grid2">${list('Connector families asked for', d.top.families)}${list('Wire sizes (total wires)', d.top.awg)}${list('Part numbers in BOMs', d.top.parts)}${list('Mounting', d.top.mounts)}</section>
<section class="card"><h2>Recent BOMs</h2>${recent ? `<div class="scroll"><table><thead><tr><th>When (UTC)</th><th>Request</th><th>Wires</th><th>Parts</th><th class="n">Builds</th><th>CSV</th></tr></thead><tbody>${recent}</tbody></table></div>` : '<p class="note">No BOMs built in this period yet.</p>'}</section>
<section class="card"><h2>By day</h2>${daily ? `<div class="scroll"><table><thead><tr><th>Day (UTC)</th><th class="n">Visits</th><th class="n">BOMs</th><th class="n">CSV downloads</th></tr></thead><tbody>${daily}</tbody></table></div>` : '<p class="note">No visits in this period yet.</p>'}
<p class="note">Updated ${esc(d.generatedAt.slice(0, 16).replace('T', ' '))} UTC. Visits older than 180 days are deleted automatically.</p></section>`;
}
$('login').addEventListener('submit', e => { e.preventDefault(); key = $('key').value.trim(); store.set(key); load(); });
$('days').addEventListener('change', load);
$('lock').addEventListener('click', () => { key = ''; store.set(''); $('key').value = ''; showLogin(''); });
if (key) load(); else showLogin('');
