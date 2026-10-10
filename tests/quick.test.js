import test from 'node:test';
import assert from 'node:assert/strict';
import {data, resolvePart, orderPart, optionsFor} from '../public/engine.js';
import {cleanEvent, summarize} from '../server/analytics.js';

test('a typed part number resolves to its catalog housing and the choices that reproduce it', () => {
  for (const typed of ['DT04-12PC', 'dt06-12sa', 'D38999/26WG16PN', 'USB3FTV7', '09330102702']) {
    const hit = resolvePart(typed);
    assert.ok(hit, typed);
    assert.equal(orderPart(hit.pn, hit.h, hit.choices).toUpperCase(), typed.toUpperCase());
  }
  assert.equal(resolvePart('NOT-A-PART'), null);
  assert.equal(resolvePart(''), null);
});

test('a resolved part can be mated with the existing-connector path', () => {
  const hit = resolvePart('DT04-12PC');
  const s = {scope: 'existing', existing: hit.pn, family: hit.h.family, connection: 'panel', mount: 'any', builds: 1, spare: 0, options: hit.choices, wires: [{count: 10, awg: 16, kind: 'power'}], accessories: {}};
  const o = optionsFor(s)[0];
  assert.equal(orderPart(o.pn, o.h, s.options), 'DT06-12SC');
});

test('events keep the guided/quick path and the funnel counts guided visits only', () => {
  assert.equal(cleanEvent({sid: 'abcdefgh1', event: 'step', step: 2, path: 'quick'}, new Set()).path, 'quick');
  assert.equal(cleanEvent({sid: 'abcdefgh1', event: 'step', step: 2, path: 'other'}, new Set()).path, undefined);
  const row = (path, max, bom) => ({day: '2026-10-01', max_step: max, last_step: max, bom, csv: 0, print: 0, stock: 0, reference: 0, path, last_ts: 0});
  const r = summarize([row('guided', 3, 0), row('quick', 6, 1), row(null, 6, 1)], Date.now(), 30);
  assert.deepEqual(r.byPath, {guided: {visits: 2, boms: 1, csv: 0}, quick: {visits: 1, boms: 1, csv: 0}});
  assert.equal(r.reached[0], 2);
  assert.equal(r.reached[6], 1);
});
