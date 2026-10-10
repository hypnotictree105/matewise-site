import test from 'node:test';
import assert from 'node:assert/strict';
import {data, optionsFor, buildBOM, orderPart, optionsForPart, partVariants} from '../public/engine.js';
import {d38999Finishes, deutschKeys} from '../public/options-data.js';
import {allowedParts} from '../dist/server/assets.js';

const housings = (o, s) => buildBOM(o, s).filter(l => l.description === 'Connector housing');
const dtState = key => ({scope: 'pair', family: 'DT', connection: 'cables', builds: 1, spare: 0, accessories: {}, options: key ? {key} : {}, wires: [{count: 10, awg: 18, kind: 'signal'}]});

test('DT 12-way housings get a key letter, defaulting to A, and both halves always match', () => {
  const o = optionsFor(dtState())[0];
  assert.deepEqual(housings(o, dtState()).map(l => l.pn), ['DT04-12PA', 'DT06-12SA']);
  assert.deepEqual(housings(o, dtState('C')).map(l => l.pn), ['DT04-12PC', 'DT06-12SC']);
  assert.match(housings(o, dtState('D'))[0].reason, /D \(Brown\).*same key/);
  assert.deepEqual(Object.fromEntries(Object.entries(deutschKeys).map(([k, v]) => [k, v.label])), {A: 'Gray', B: 'Black', C: 'Green', D: 'Brown'});
});

test('unkeyed DEUTSCH sizes, fixed records and unknown choices are left alone', () => {
  assert.equal(orderPart('DT04-4P', data.housings['DT04-4P'], {key: 'C'}), 'DT04-4P');
  assert.equal(orderPart('DT04-12PA-FLANGE', data.housings['DT04-12PA-FLANGE'], {key: 'C'}), 'DT04-12PA-FLANGE');
  assert.equal(orderPart('DT04-12P', data.housings['DT04-12P'], {key: 'Q'}), 'DT04-12PA');
});

test('DT 8-way part numbers use the two-digit TE format', () => {
  assert.ok(data.housings['DT04-08P'] && data.housings['DT06-08S']);
  assert.equal(data.housings['DT04-8P'], undefined);
  assert.deepEqual(partVariants('DT06-08S', data.housings['DT06-08S']), ['DT06-08SA', 'DT06-08SB', 'DT06-08SC', 'DT06-08SD']);
});

test('D38999 finish and keying letters change in place; hermetic codes stay off standard shells', () => {
  const pn = 'D38999/26WG16PN', h = data.housings[pn];
  assert.equal(orderPart(pn, h, {finish: 'Z', keying: 'B'}), 'D38999/26ZG16PB');
  assert.equal(orderPart(pn, h, {finish: 'Y'}), pn);
  const finish = optionsForPart(pn, h).find(o => o.id === 'finish');
  assert.deepEqual(Object.keys(finish.values).sort(), ['F', 'G', 'J', 'K', 'L', 'M', 'S', 'T', 'W', 'Z']);
  assert.equal(Object.keys(d38999Finishes).length, 13);
  assert.ok(optionsForPart(pn, h).every(o => o.verification === 'verified' && o.source_url.startsWith('https://d38999.federalconnectors.com/')));
});

test('Glenair codes and the source-checked reference keep their fixed finish', () => {
  const glenair = Object.keys(data.housings).find(p => p.startsWith('233-105'));
  assert.equal(orderPart(glenair, data.housings[glenair], {finish: 'Z', keying: 'A'}), glenair);
  const ref = Object.entries(data.housings).find(([, h]) => h.reference_path);
  assert.deepEqual(optionsForPart(ref[0], ref[1]), []);
});

test('chosen variants can be stock-checked', () => {
  const allowed = new Set(allowedParts);
  for (const pn of ['DT04-12PC', 'DT06-12SD', 'DT04-08PB', 'D38999/26ZG16PB']) assert.ok(allowed.has(pn), pn);
  assert.ok(!allowed.has('DT04-12PE'));
});
