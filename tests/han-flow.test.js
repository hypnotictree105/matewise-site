import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise the real app event handlers/renderers without a server, network or analytics.
// This verifies wizard state transitions and generated controls, not browser layout.
test('guided Han flow carries wire area, enclosure, diameter and covers into the rendered BOM', async () => {
  const listeners={},nodes=new Map();
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',style:{},handlers:{},
      addEventListener(name,fn){this.handlers[name]=fn;},querySelector(){return null;},focus(){}});
    return nodes.get(id);
  };
  globalThis.document={body:{classList:{toggle(){}}},querySelectorAll:()=>[],getElementById:node,querySelector:()=>null,addEventListener:(name,fn)=>listeners[name]=fn};
  globalThis.window={doNotTrack:'1',scrollTo(){}};
  globalThis.addEventListener=()=>{};
  await import('../public/app.js');
  const change=(name,value,type='select')=>listeners.change({target:{name,value,type:type==='select'?'select-one':type,tagName:type==='select'?'SELECT':'INPUT',checked:value===true}});
  const action=(action,index)=>listeners.click({target:{closest:()=>({dataset:{action,index}})}});
  const next=()=>{node('next').handlers.click();assert.equal(node('error').textContent,'');};
  const screen=()=>node('screen').innerHTML;
  change('family','HanE');change('builds','2','number');next();
  assert.match(screen(),/Conductor area \(mm²\)/);assert.match(screen(),/Protective earth conductor/);
  action('remove-wire','1');change('wires.0.count','5','number');change('wires.0.mm2','1.5');change('protectiveEarth','separate');next();
  change('shielding','no');next();change('mount','flange','radio');next();
  assert.match(screen(),/Leave spare positions empty/);assert.doesNotMatch(screen(),/seals per half included/);
  change('selected','09330062702','radio');next();
  assert.match(screen(),/Choose the enclosure around your inserts/);
  assert.match(screen(),/name="accessories.diameterB"/);assert.doesNotMatch(screen(),/name="accessories.diameterA"/);
  change('accessories.shellAssembly','han6b-panel-m20');change('accessories.glandSeal','6-12');change('accessories.jacket','jacketed');
  change('accessories.cap',true,'checkbox');change('accessories.capEnds','both');
  assert.match(screen(),/09300065405/);assert.match(screen(),/09300065423/);
  next();assert.match(screen(),/Enter the finished cable outside diameter/);assert.doesNotMatch(screen(),/class="part">19000005081/);
  node('back').handlers.click();change('accessories.diameterB','10','number');next();
  for(const pn of ['09330062702','09330062602','09330006204','09330006104','09300060301','19300061440','19000005081','09300065405','09300065423'])assert.match(screen(),new RegExp(pn));
  assert.match(screen(),/10×/);assert.match(screen(),/No additional part required/);
  assert.match(screen(),/<strong>1<\/strong><small>part selections open/);
  // Returning to wire entry and changing AWG must clear the old area selection.
  listeners.click({target:{closest:()=>({dataset:{step:'1'}})}});
  change('wires.0.awg','18');
  assert.match(screen(),/value="0.75"/);assert.match(screen(),/value="1.0"/);assert.doesNotMatch(screen(),/value="1.5" selected/);
  listeners.click({target:{closest:()=>({dataset:{mode:'quick'}})}});
  assert.match(screen(),/Quick entry/);assert.match(screen(),/Conductor area/);assert.match(screen(),/Choose the enclosure around your inserts/);
});
