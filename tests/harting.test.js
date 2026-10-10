import test from 'node:test';
import assert from 'node:assert/strict';
import {data, optionsFor, buildBOM, mates} from '../public/engine.js';

const state = (wires, connection = 'panel', family = 'HanE') => ({scope: 'pair', family, connection, builds: 1, spare: 0, options: {}, accessories: {protection: true}, wires});

test('Han E inserts come as male/female pairs of the same size and all cite a source', () => {
  const han = Object.entries(data.housings).filter(([, h]) => h.family === 'HanE');
  assert.equal(han.length, 8);
  for (const [pn, h] of han) {
    assert.equal(h.verification, 'verified'); assert.ok(h.source_url);
    const m = mates(pn);
    assert.equal(m.length, 1);
    assert.equal(m[0][1].shell_size, h.shell_size);
    assert.notEqual(m[0][1].gender, h.gender);
  }
});

test('Han E BOM: female insert on End A, contacts by wire size, hood/housing lines, no per-cavity seals or backshells', () => {
  const s = state([{count: 8, awg: 16, mm2: '1.5', kind: 'power'}, {count: 1, awg: 18, mm2: '1.0', kind: 'signal'}]);
  const o = optionsFor(s)[0];
  assert.equal(o.pn, '09330102702');
  assert.equal(o.mate[0], '09330102602');
  const lines = buildBOM(o, s);
  const a = lines.filter(l => l.end === 'End A'), b = lines.filter(l => l.end === 'End B');
  assert.deepEqual(a.filter(l => /contacts/.test(l.description)).map(l => [l.pn, l.qty]).sort(), [['09330006204', 8], ['09330006205', 1]]);
  assert.deepEqual(b.filter(l => /contacts/.test(l.description)).map(l => [l.pn, l.qty]).sort(), [['09330006104', 8], ['09330006105', 1]]);
  assert.ok(a.some(l => /Bulkhead- or surface-mounted housing · Han size 10B/.test(l.description) && l.pn === null));
  assert.ok(b.some(l => /^Hood · Han size 10B/.test(l.description)));
  assert.ok(!lines.some(l => /Unused-cavity seals|backshell|Heat-shrink/i.test(l.description)));
  assert.ok(lines.some(l => /Cable entry \/ gland/.test(l.description)));
  const cables = buildBOM(optionsFor(state([{count: 8, awg: 16, kind: 'power'}], 'cables'))[0], state([{count: 8, awg: 16, kind: 'power'}], 'cables'));
  assert.ok(cables.some(l => /^Coupler housing · Han size 10B/.test(l.description)));
});

test('Han E is a preview: only offered when chosen explicitly', () => {
  assert.ok(!optionsFor(state([{count: 10, awg: 18, kind: 'signal'}], 'panel', 'any')).some(o => o.h.family === 'HanE'));
  assert.ok(optionsFor(state([{count: 24, awg: 14, kind: 'power'}])).some(o => o.pn === '09330242702'));
  assert.equal(optionsFor(state([{count: 25, awg: 14, kind: 'power'}])).length, 0);
});
