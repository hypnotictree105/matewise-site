import test from 'node:test';
import assert from 'node:assert/strict';
import {candidatesFor, explainNoMatch, orderPart, buildBOM} from '../public/engine.js';

const base = {scope: 'pair', connection: 'cables', family: 'D38999', mount: 'any', builds: 1, spare: 0, options: {}, wires: [{count: 8, awg: 16, kind: 'power'}], accessories: {}};

test('D38999 cable to cable pairs an Amphenol TV line receptacle with an Amphenol TV plug', () => {
  const c = candidatesFor(base);
  assert.ok(c.length > 0);
  assert.equal(c[0].pn, 'TV01RW-17-8S');
  assert.equal(c[0].mate[0], 'TV06RW-17-8P');
  assert.equal(orderPart(c[0].pn, c[0].h, {finish: 'RF'}), 'TV01RF-17-8S');
  const housing = buildBOM(c[0], base).filter(l => l.description === 'Connector housing');
  assert.ok(housing.every(l => /Amphenol Aerospace/.test(l.reason) && !/Glenair/.test(l.reason)));
});

test('no-match explanations name the requirement that failed and offer requests that do match', () => {
  const tooMany = explainNoMatch({...base, family: 'DT', wires: [{count: 20, awg: 16, kind: 'power'}]});
  assert.match(tooMany.reasons[0], /most positions .* DEUTSCH DT insert here is 12/);
  const awg = explainNoMatch({...base, family: 'DT', wires: [{count: 2, awg: 12, kind: 'power'}]});
  assert.match(awg.reasons[0], /no DEUTSCH DT contact .* takes this wire size/);
  assert.ok(awg.alternatives.some(a => a.patch.family === 'any' && a.count > 0));
  const spare = explainNoMatch({...base, connection: 'panel', spare: 60});
  assert.match(spare.reasons[0], /at least 60 unused positions/);
  assert.deepEqual(spare.alternatives.map(a => a.patch), [{connection: 'cables', mount: 'any'}, {spare: 0}].filter(p => candidatesFor({...base, connection: 'panel', spare: 60, ...p}).length));
  for (const alt of spare.alternatives) assert.equal(candidatesFor({...base, connection: 'panel', spare: 60, ...alt.patch}).length, alt.count);
});

