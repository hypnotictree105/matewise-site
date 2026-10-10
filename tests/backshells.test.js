import test from 'node:test';
import assert from 'node:assert/strict';
import {data, optionsFor, buildBOM, backshellsFor, pickBackshell} from '../public/engine.js';
import {dtBackshells} from '../public/backshell-data.js';
import {cableEndDrawing} from '../public/backshell-guide.js';
import {allowedParts} from '../dist/server/assets.js';

const state = (family, wires, acc) => ({scope: 'pair', family, connection: 'cables', builds: 2, spare: 0, options: {}, wires, accessories: {exit: 'straight', ...acc}});
const backshellLines = s => buildBOM(optionsFor(s)[0], s).filter(l => /backshell/i.test(l.description));

test('TE DT backshell table is complete and fits by size and plug/receptacle', () => {
  const all = dtBackshells();
  assert.equal(new Set(all.map(b => b.pn)).size, all.length);
  assert.equal(all.length, 6 * 4 + 4 * 4); // 4 basic per size, plus 4 strain-relief for 2-6 positions
  const r = backshellsFor('DT04-12P', data.housings['DT04-12P']).map(b => b.pn).sort();
  assert.deepEqual(r, ['1011-249-1205', '1011-250-1205']);
  assert.deepEqual(backshellsFor('DT06-08S', data.housings['DT06-08S']).map(b => b.pn).sort(), ['1011-243-0805', '1011-244-0805']);
  assert.equal(backshellsFor('DT04-12PA-FLANGE', data.housings['DT04-12PA-FLANGE']).length, 0);
});

test('BOM picks straight or 90° and the strain-relief version for jacketed cable', () => {
  const four = [{count: 4, awg: 16, kind: 'power'}];
  assert.deepEqual(backshellLines(state('DT', four, {protection: true})).map(l => l.pn), ['1011-237-0405', '1011-235-0405']);
  assert.deepEqual(backshellLines(state('DT', four, {protection: true, exit: 'right', jacket: 'jacketed'})).map(l => l.pn), ['1011-266-0405', '1011-264-0405']);
  const open = backshellLines(state('DT', four, {protection: true, exit: 'unknown'}));
  assert.ok(open.every(l => l.pn === null && /straight or 90°/.test(l.reason)));
  assert.ok(backshellLines(state('DT', four, {protection: true})).every(l => l.total === 2 && l.verification === 'verified'));
});

test('D38999 lines name the AS85049 designation for the shell size but stay open until the finish is added', () => {
  const s = state('D38999', [{count: 8, awg: 16, kind: 'power'}], {protection: true});
  const o = optionsFor({...s, connection: 'panel'})[0];
  const lines = buildBOM(o, {...s, connection: 'panel'}).filter(l => /backshell/i.test(l.description));
  assert.ok(lines.length === 2 && lines.every(l => l.pn === null && /^M85049\/38-\d\d$/.test(l.designation) && /finish letter/.test(l.reason)));
  const pick = pickBackshell(backshellsFor(o.pn, o.h), {shield: true, exit: 'right'});
  assert.equal(pick.pick, null);
});

test('drawings render for every recorded backshell', () => {
  const h = data.housings['DT04-12P'];
  for (const b of backshellsFor('DT04-12P', h)) assert.match(cableEndDrawing(h, b), /^<svg[\s\S]*<\/svg>$/);
  assert.match(cableEndDrawing(data.housings['D38999/26WG16PN'], {kind: 'shield', angle: 45}), /role="img"/);
});

test('TE backshell part numbers can be stock-checked', () => {
  const allowed = new Set(allowedParts);
  assert.ok(dtBackshells().every(b => allowed.has(b.pn)));
});

test('step 6 panels render for DEUTSCH, D38999 and the reference path', async () => {
  const {optionsPanel} = await import('../public/option-guide.js');
  const {backshellPanel} = await import('../public/backshell-guide.js');
  const {endpoints} = await import('../public/engine.js');
  for (const [family, wires] of [['DT', [{count: 10, awg: 16, kind: 'power'}]], ['DT', [{count: 6, awg: 16, kind: 'power'}]], ['D38999', [{count: 8, awg: 16, kind: 'power'}]]]) {
    const s = {...state(family, wires, {protection: true}), connection: family === 'D38999' ? 'panel' : 'cables'};
    const ends = endpoints(optionsFor(s)[0], s);
    assert.match(optionsPanel(ends, s.options), /option-guide/);
    assert.match(backshellPanel(ends, s), /backshell-guide/);
  }
  const [pn, h] = Object.entries(data.housings).find(([, x]) => x.reference_path);
  assert.match(optionsPanel([{label: 'End A', pn, h}], {}), /Adapter thread: M12/);
});

test('DT reference sizes come from the TE table and appear in the BOM', async () => {
  const {dimensionsFor} = await import('../public/engine.js');
  assert.deepEqual(dimensionsFor('DT04-12P', data.housings['DT04-12P']).overall.mm, {length: 45.9, height: 22.3, width: 40.6});
  assert.equal(dimensionsFor('DT04-12P', data.housings['DT04-12P']).overall.verification, 'inferred');
  assert.equal(dimensionsFor('DT06-4S', data.housings['DT06-4S']).overall.verification, 'verified');
  const lines = buildBOM(optionsFor(state('DT', [{count: 4, awg: 16, kind: 'power'}], {}))[0], state('DT', [{count: 4, awg: 16, kind: 'power'}], {}));
  assert.match(lines[0].reason, /Reference size 45\.9 L × 20\.8 W × 19\.7 H mm/);
  assert.ok(lines.some(l => /2\.23–3\.68 mm insulation/.test(l.reason)));
});
