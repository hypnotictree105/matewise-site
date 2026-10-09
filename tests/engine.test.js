import test from 'node:test';
import assert from 'node:assert/strict';
import {data,fitHousing,optionsFor,buildBOM,validateWires,exactPart,mates,csv,sourceOf,sourceLabel} from '../public/engine.js';
const state=()=>({scope:'pair',connection:'panel',family:'D38999',builds:3,spare:0,wires:[{count:8,awg:16,kind:'power'},{count:4,awg:20,kind:'signal'}],accessories:{boot:true,protection:true,shield:true,tools:true,exit:'straight',diameterA:'12',diameterB:'10'}});
test('rejects malformed and zero wire counts',()=>{assert.ok(validateWires([{count:0,awg:16,kind:'power'}]));assert.ok(validateWires([{count:'8x16',awg:16,kind:'power'}]));assert.ok(validateWires([{count:2.5,awg:16,kind:'power'}]));});
test('DTM contact range blocks 24 AWG despite generic cavity capacity',()=>{assert.equal(fitHousing(data.housings['DTM04-4P'],[{count:2,awg:24}]),null);assert.ok(fitHousing(data.housings['DTM04-4P'],[{count:2,awg:20}]));});
test('mixed requirement yields two distinct mating roles',()=>{const s=state();const opts=optionsFor(s);assert.ok(opts.length);for(const o of opts){assert.notEqual(o.h.role,o.mate[1].role);assert.notEqual(o.h.gender,o.mate[1].gender);assert.ok(fitHousing(o.mate[1],s.wires));}});
test('both ends, contacts and boot dependencies are in scaled BOM',()=>{const s=state(),o=optionsFor(s)[0],lines=buildBOM(o,s);assert.equal(lines.filter(l=>l.description==='Connector housing').length,2);assert.equal(lines.filter(l=>l.description.startsWith('Heat-shrink boot')).length,2);assert.equal(lines.filter(l=>l.description==='Boot-compatible adapter / backshell').length,2);assert.equal(lines.find(l=>l.description==='Connector housing').total,3);assert.equal(lines.find(l=>l.end==='Tools').total,1);});
test('boot parts stay unresolved and wildcards are never exact',()=>{const s=state();assert.ok(buildBOM(optionsFor(s)[0],s).filter(l=>l.description.startsWith('Heat-shrink boot')).every(l=>l.pn===null));assert.equal(exactPart('0460-202-16**'),false);assert.equal(exactPart('DT04-4P'),true);});
test('existing connector requests return only the new half',()=>{const s={...state(),scope:'existing',existing:'DT04-4P',family:'DT',wires:[{count:4,awg:16,kind:'power'}]};const o=optionsFor(s)[0];assert.equal(o.pn,'DT06-4S');assert.equal(buildBOM(o,s).filter(l=>l.description==='Connector housing').length,1);});
test('high speed and RF are not treated as ordinary wires',()=>{for(const kind of ['data','coax'])assert.deepEqual(optionsFor({...state(),wires:[{count:2,awg:20,kind}]}),[]);});
test('minimum spare positions are enforced',()=>{const s={...state(),spare:6};assert.ok(optionsFor(s).every(o=>o.fit.spare>=6));});
test('CSV labels unavailable stock and unresolved part numbers',()=>{const s=state(),text=csv(buildBOM(optionsFor(s)[0],s));assert.match(text,/Not checked/);assert.match(text,/Unresolved/);});
test('unknown mating part returns no candidates',()=>assert.deepEqual(mates('unknown'),[]));
test('both halves always come from the same manufacturer',()=>{
 for(const pn of Object.keys(data.housings))for(const [m] of mates(pn))assert.equal(sourceOf(data.housings[m]),sourceOf(data.housings[pn]),pn+' -> '+m);
 // Glenair 233-105 inline receptacles no longer pair with generic MIL-spec plugs.
 const s={...state(),connection:'cables'};assert.ok(optionsFor(s).every(o=>sourceOf(o.h)===sourceOf(o.mate[1])));
 const glenair=optionsFor({...state(),family:'D38999',connection:'cables',wires:[{count:3,awg:20,kind:'signal'}]}).filter(o=>sourceOf(o.h)==='Glenair');
 assert.ok(glenair.length);for(const o of glenair)assert.equal(sourceOf(o.mate[1]),'Glenair');
 const dt=optionsFor({...state(),family:'DT',connection:'cables',wires:[{count:4,awg:16,kind:'power'}]})[0];
 assert.equal(sourceLabel(dt.h),'TE Connectivity (DEUTSCH)');
 const lines=buildBOM(dt,{...state(),family:'DT',connection:'cables',wires:[{count:4,awg:16,kind:'power'}],accessories:{}});
 assert.ok(lines.filter(l=>l.description==='Connector housing').every(l=>l.manufacturer==='TE Connectivity (DEUTSCH)'));
 assert.match(csv(lines),/Manufacturer/);
});
test('dust caps match the 12-position housings independently of ten wires and scale per end',()=>{
 const s={...state(),connection:'cables',family:'DT',wires:[{count:10,awg:16,kind:'power'}],accessories:{cap:true,capEnds:'both'}};
 const o=optionsFor(s)[0],caps=()=>buildBOM(o,s).filter(l=>l.description==='Dust cap / protective cover');
 assert.deepEqual(caps().map(l=>l.pn),['DT12P-DC','1011-349-1205']);assert.ok(caps().every(l=>l.total===3));
 s.accessories.capEnds='b';assert.deepEqual(caps().map(l=>l.pn),['1011-349-1205']);
 s.accessories.cap=false;assert.equal(caps().length,0);
});
test('D38999 cover roles are independent of contact gender and missing caps stay unresolved',()=>{
 const s=reference();s.accessories.cap=true;const o=optionsFor(s).find(o=>o.h.reference_path);
 assert.deepEqual(buildBOM(o,s).filter(l=>l.description==='Dust cap / protective cover').map(l=>l.pn),['D38999/33F9R','D38999/32F9R']);
 Object.assign(s,{scope:'existing',family:'DT',existing:'DT06-2S',wires:[{count:2,awg:16,kind:'power'}]});
 assert.equal(buildBOM(optionsFor(s)[0],s).find(l=>l.description==='Dust cap / protective cover').pn,null);
});
test('10 DT conductors use 12 positions and two plugs per half, scaling purchases',()=>{
 const s={...state(),connection:'cables',family:'DT',wires:[{count:10,awg:16,kind:'power'}],accessories:{}};
 const o=optionsFor(s)[0];assert.equal(o.pn,'DT04-12P');assert.equal(o.fit.spare,2);
 const seals=buildBOM(o,s).filter(l=>l.description.startsWith('Unused-cavity'));
 assert.equal(seals.length,2);for(const l of seals){assert.equal(l.qty,2);assert.equal(l.total,6);}
 s.scope='existing';s.existing=o.pn;s.builds=1;
 const single=buildBOM(optionsFor(s)[0],s).filter(l=>l.description.startsWith('Unused-cavity'));
 assert.equal(single.length,1);assert.equal(single[0].total,2);
});
const reference=()=>({...state(),builds:1,shielding:'no',wires:[{count:3,awg:22,kind:'signal'}],accessories:{protection:true,boot:true,exit:'straight',jacket:'jacketed',diameterA:'5',diameterB:'5',bootMaterial:'type1w1',adhesive:'precoat',panelHardware:'unknown'}});
test('reference resolves contacts, adapter and boot with manufacturer evidence',()=>{
 const s=reference(),o=optionsFor(s).find(o=>o.h.reference_path);assert.ok(o);assert.equal(o.mate[1].reference_path,o.h.reference_path);
 const lines=buildBOM(o,s);assert.ok(lines.every(l=>exactPart(l.pn)));assert.equal(lines.find(l=>l.description==='Panel jam nut').total,null);
 assert.equal(lines.filter(l=>l.pn==='770-003S102W1').length,2);
 for(const l of lines)assert.ok(l.source_url);
 s.accessories.panelHardware='included';assert.equal(buildBOM(o,s).find(l=>l.description==='Panel jam nut').total,0);
});
test('reference invalidates changed diameter, exit, shield and material',()=>{
 for(const [key,value] of [['diameterA','3.9'],['diameterA','6.1'],['exit','right'],['shield',true],['bootMaterial','unknown']]){
  const s=reference(),o=optionsFor(s).find(o=>o.h.reference_path);s.accessories[key]=value;
  assert.equal(buildBOM(o,s).find(l=>l.end==='End A'&&l.description.startsWith('Heat-shrink boot')).pn,null);
 }
});
test('unused D38999 positions include seals and uncrimped contacts',()=>{
 const s=reference();s.wires[0].count=2;const o=optionsFor(s).find(o=>o.h.reference_path),lines=buildBOM(o,s);
 assert.equal(lines.filter(l=>l.description.startsWith('Uncrimped')).length,2);
 assert.equal(lines.filter(l=>l.description.startsWith('Unused-cavity')).length,2);
});

test('verified connectors rank above inferred ones even with more spare positions',()=>{
 const s={scope:'pair',connection:'cables',family:'any',builds:1,spare:0,wires:[{count:10,awg:18,kind:'signal'}],accessories:{}};
 const options=optionsFor(s),top=options[0];
 assert.equal(top.pn,'DT04-12P');assert.equal(top.h.verification,'verified');assert.equal(top.mate[1].verification,'verified');
 const rank=o=>(o.h.verification==='verified'?0:1)+(o.mate&&o.mate[1].verification!=='verified'?1:0);
 for(let i=1;i<options.length;i++)assert.ok(rank(options[i-1])<=rank(options[i]));
});
