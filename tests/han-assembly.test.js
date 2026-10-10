import test from 'node:test';
import assert from 'node:assert/strict';
import {data, optionsFor, buildBOM, capForEnd, endpoints, reviewIssues} from '../public/engine.js';
import {allowedParts} from '../dist/server/assets.js';

const request = () => ({scope: 'pair', family: 'HanE', connection: 'panel', mount: 'flange',
  builds: 3, spare: 0, options: {}, shielding: 'no', protectiveEarth: 'separate',
  wires: [{count: 5, awg: 16, mm2: '1.5', kind: 'power'}],
  accessories: {shellAssembly: 'han6b-panel-m20', exit: 'straight', jacket: 'jacketed',
    glandSeal: '6-12', diameterB: '10', protection: false, cap: true, capEnds: 'both'}});
const bom = s => buildBOM(optionsFor(s)[0], s);
const has = (lines,pn) => lines.some(l=>l.pn===pn);

test('6B panel assembly has correct per-end parts, one required gland, covers and scaled quantities', () => {
  const s=request(), lines=bom(s);
  const expected = {
    '09330062702': ['End A',1], '09330062602': ['End B',1],
    '09330006204': ['End A',5], '09330006104': ['End B',5],
    '09300060301': ['End A',1], '19300061440': ['End B',1],
    '19000005081': ['End B',1], '09300065405': ['End A',1], '09300065423': ['End B',1]
  };
  for(const [pn,[end,qty]] of Object.entries(expected)) {
    const rows=lines.filter(l=>l.pn===pn); assert.equal(rows.length,1,pn);
    assert.equal(rows[0].end,end); assert.equal(rows[0].qty,qty); assert.equal(rows[0].total,qty*3);
    assert.equal(rows[0].verification,'verified'); assert.ok(rows[0].source_url);
  }
  assert.equal(lines.filter(l=>/gland/i.test(l.description)).length,1);
  assert.ok(!lines.some(l=>/sealing plugs|Unused-cavity seals|O-ring/.test(l.description)));
  assert.equal(lines.filter(l=>/unused position/.test(l.description)).length,2);
  assert.ok(lines.filter(l=>/unused position/.test(l.description)).every(l=>l.qty===0));
  assert.equal(lines.filter(l=>l.qty>0&&!l.pn).length,1,'panel fasteners/package contents remain open');
  assert.ok(lines.filter(l=>/Connector insert/.test(l.description)).every(l=>/PE screw M4: 1.2 Nm/.test(l.reason)));
  assert.ok(reviewIssues(optionsFor(s)[0],s,lines).some(i=>/PE is recorded separately/.test(i)));
});

test('gland requires a real diameter inside the chosen seal range and a jacket', () => {
  for(const [range,diameter,valid] of [['5-9','5',true],['5-9','9',true],['5-9','9.01',false],['5-9','4.99',false],['6-12','6',true],['6-12','12',true],['6-12','12.01',false],['6-12','5.99',false],['unknown','8',false],['6-12','',false],['6-12','oops',false],['6-12','0',false]]) {
    const s=request();Object.assign(s.accessories,{glandSeal:range,diameterB:diameter});
    const lines=bom(s);assert.equal(has(lines,'19000005081'),valid,`${range}: ${diameter}`);
    assert.equal(lines.filter(l=>/gland/i.test(l.description)).length,1);
    assert.ok(has(lines,'19300061440'),'missing gland answers do not erase the matching hood');
    if(!valid)assert.ok(lines.some(l=>/gland/.test(l.description)&&!l.pn&&l.qty===1));
  }
  for(const jacket of ['unknown','bundle']){const s=request();s.accessories.jacket=jacket;assert.ok(!has(bom(s),'19000005081'));}
});

test('unsupported arrangements never inherit the reference hood, gland or covers', () => {
  for(const mutate of [s=>s.mount='jam-nut',s=>s.accessories.exit='right',s=>s.accessories.exit='unknown',s=>s.shielding='yes',s=>s.accessories.shield=true,s=>s.accessories.boot=true,s=>s.accessories.shellAssembly='unknown',s=>s.connection='cables',s=>s.wires[0].count=7,s=>{s.scope='existing';s.existing='09330062602';}]) {
    const s=request();mutate(s);const lines=bom(s);
    for(const pn of ['09300060301','19300061440','19000005081','09300065405','09300065423'])assert.ok(!has(lines,pn),pn);
    assert.ok(lines.some(l=>l.qty>0&&!l.pn));
  }
});

test('covers follow selected shell and selected ends, independently of conductor count', () => {
  for(const [capEnds,expected] of [['a',['09300065405']],['b',['09300065423']],['both',['09300065405','09300065423']]]){
    const s=request();s.accessories.capEnds=capEnds;s.builds=7;
    const lines=bom(s).filter(l=>/Dust cap/.test(l.description));
    assert.deepEqual(lines.map(l=>l.pn),expected);assert.ok(lines.every(l=>l.total===7));
    const o=optionsFor(s)[0];assert.deepEqual(endpoints(o,s).map(e=>capForEnd(o,s,e)?.pn),['09300065405','09300065423']);
  }
  const s=request();s.accessories.cap=false;assert.ok(!bom(s).some(l=>/Dust cap/.test(l.description)));
});

test('AWG alone does not order Han contacts; actual area separates overlapping AWG choices', () => {
  const s=request();s.wires=[{count:2,awg:18,mm2:'0.75',kind:'signal'},{count:3,awg:18,mm2:'1.0',kind:'signal'}];
  let lines=bom(s);
  for(const [pn,n] of [['09330006114',2],['09330006214',2],['09330006105',3],['09330006205',3]])assert.equal(lines.find(l=>l.pn===pn)?.qty,n);
  for(const mm2 of ['',undefined,'1.5','<invalid>']){
    s.wires=[{count:6,awg:18,mm2,kind:'signal'}];
    lines=bom(s).filter(l=>/contacts/.test(l.description));assert.equal(lines.length,2);assert.ok(lines.every(l=>l.pn===null&&l.qty===6));
  }
  for(const [awg,mm2,male,female] of [[12,'3.0','09330006106','09330006206'],[12,'4.0','09330006107','09330006207'],[26,'0.14–0.37','09330006127','09330006227'],[20,'0.5','09330006121','09330006220']]){
    s.wires=[{count:6,awg,mm2,kind:'signal'}];lines=bom(s);assert.ok(has(lines,male));assert.ok(has(lines,female));
  }
});

test('shell lock, size and gland thread mismatches fail closed', () => {
  const p=data.families.HanE.shell_assemblies[0];
  for(const [part,key,value] of [[p.ends['End B'].shell,'locking','double-lever'],[p.ends['End A'].shell,'shell_size','10B'],[p.ends['End B'].gland,'thread','M25x1.5']]){
    const original=part[key];
    try{part[key]=value;assert.ok(!has(bom(request()),'19300061440'));}finally{part[key]=original;}
  }
});

test('all emitted assembly parts are available to the exact-part stock endpoint', () => {
  for(const row of bom(request()).filter(l=>l.pn))assert.ok(allowedParts.includes(row.pn),row.pn);
  for(const pn of ['09330006114','09330006214','09330006106','09330006206'])assert.ok(allowedParts.includes(pn),pn);
});
