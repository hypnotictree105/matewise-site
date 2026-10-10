import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from '../public/engine.js';
import {insertLayouts, insertOutline} from '../public/insert-layouts.js';
import {faceDiagram} from '../public/option-guide.js';

test('every D38999 arrangement in the catalog has MIL-STD-1560 positions matching its contact counts', () => {
  for (const [code, a] of Object.entries(data.insert_arrangements)) {
    const lay = insertLayouts[code];
    assert.ok(lay, code);
    const counts = {};
    for (const [, , , size] of lay.contacts) counts[size] = (counts[size] || 0) + 1;
    assert.deepEqual(counts, Object.fromEntries(Object.entries(a.profile).map(([k, v]) => [k, v])), code);
    assert.equal(new Set(lay.contacts.map(c => c[0])).size, lay.contacts.length, code + ' ids unique');
    for (const [id, x, y] of lay.contacts) assert.ok(Math.hypot(x, y) < insertOutline[lay.shell], `${code} ${id} inside the insert`);
  }
});

test('known positions from the standard', () => {
  const at = (code, id) => insertLayouts[code].contacts.find(c => c[0] === id);
  assert.deepEqual(at('C8', 'A').slice(1), [0.065, 0.157, '20']);
  assert.deepEqual(at('D15', 'P').slice(1), [0, -0.077, '16']);
  assert.equal(at('J24', 'A')[3], '12');
});

test('socket faces are the mirror image of pin faces and labels render', () => {
  const pin = faceDiagram('D38999/26WC8PN', data.housings['D38999/26WC8PN'], {}, 300);
  const sock = faceDiagram('D38999/24WC8SN', data.housings['D38999/24WC8SN'], {}, 300);
  assert.match(pin, /cx="6\.50" cy="-15\.70"/);
  assert.match(sock, /cx="-6\.50" cy="-15\.70"/);
  assert.match(pin, />A<\/text>/);
  assert.doesNotMatch(faceDiagram('D38999/26WC8PN', data.housings['D38999/26WC8PN'], {}, 68), /<text/);
});
