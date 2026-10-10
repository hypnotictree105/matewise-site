import test from 'node:test';
import assert from 'node:assert/strict';
import {data, optionsFor, buildBOM, validateWires, mates} from '../public/engine.js';

const state = (wires, family = 'any', connection = 'panel') => ({scope: 'pair', family, connection, builds: 1, spare: 0, options: {}, accessories: {}, wires});
const contactLines = (o, s) => buildBOM(o, s).filter(l => /contacts/.test(l.description));

test('RG-316 coax goes in D38999 size 12 cavities with M39029/102 and /103 contacts', () => {
  const s = state([{count: 2, kind: 'coax', cable: 'RG-316'}, {count: 4, awg: 16, kind: 'power'}]);
  const o = optionsFor(s)[0];
  assert.equal(o.h.family, 'D38999');
  const coax = contactLines(o, s).filter(l => /coax/.test(l.description));
  assert.deepEqual(coax.map(l => [l.end, l.pn, l.qty]), [['End A', 'M39029/103-559', 2], ['End B', 'M39029/102-558', 2]]);
  assert.ok(coax.every(l => l.verification === 'verified' && /glenair/.test(l.source_url)));
});

test('RG-180 uses size 8 cavities; size 8 layouts come as mating pairs', () => {
  const o = optionsFor(state([{count: 4, kind: 'coax', cable: 'RG-180'}]));
  assert.ok(o.length && o.every(x => x.h.cavity_profile[8] >= 4));
  assert.equal(o[0].pn, 'D38999/20WG75SN');
  assert.equal(mates('D38999/20WG75SN')[0][0], 'D38999/26WG75PN');
  assert.deepEqual(contactLines(o[0], state([{count: 4, kind: 'coax', cable: 'RG-180'}])).map(l => l.pn), ['M39029/59-366', 'M39029/60-367']);
  assert.equal(optionsFor(state([{count: 2, kind: 'coax', cable: 'RG-180'}], 'DT')).length, 0);
});

test('USB gets a dedicated Amphenol rugged USB pair of the same version, with the code left to complete', () => {
  const s = state([{count: 1, kind: 'data', protocol: 'USB 3.x'}]);
  const o = optionsFor(s);
  assert.deepEqual(o.map(x => x.pn + '+' + x.mate[0]), ['USB3FTV2+USB3FTV6', 'USB3FTV7+USB3FTV6']);
  const housings = buildBOM(o[0], s).filter(l => l.description === 'Connector housing');
  assert.ok(housings.every(l => l.pn === null && /Amphenol catalog/.test(l.reason) && l.designation));
  assert.ok(optionsFor(state([{count: 1, kind: 'data', protocol: 'USB 2.0'}])).every(x => x.pn.startsWith('USBFTV')));
});

test('USB must be its own connection; other high-speed links are refused, not faked', () => {
  assert.match(validateWires([{count: 1, kind: 'data', protocol: 'USB 3.x'}, {count: 2, awg: 16, kind: 'power'}]), /one USB port/);
  assert.match(validateWires([{count: 2, kind: 'data', protocol: 'USB 2.0'}]), /one USB port/);
  assert.equal(optionsFor(state([{count: 1, kind: 'data', protocol: 'Other'}])).length, 0);
  assert.match(validateWires([{count: 1, kind: 'coax'}]), /coax cable type/);
});
