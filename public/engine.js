import {capFor,wantsCap} from './dust-caps.js';
import data from './catalog.js';
import {extendCatalog} from './reference-data.js';
import {extendOptions} from './options-data.js';
import {dtBackshells,d38999Backshells,shellNumber} from './backshell-data.js';
import {dtDims,insulationOD} from './dimension-data.js';
import {extendHarting} from './harting-data.js';
import {extendHighSpeed} from './highspeed-data.js';
extendCatalog(data);extendOptions(data);extendHarting(data);extendHighSpeed(data);
// Ordering options (finish, keying, key color) a family declares in options-data.js.
export function optionsForPart(pn,h){
  if(!h||h.reference_path)return [];
  return (data.families[h.family]?.options||[]).flatMap(o=>{
    const values=o.values(h);
    if(o.kind==='suffix')return o.cavities.includes(h.cavities)&&new RegExp(o.regex).test(pn)?[{...o,values}]:[];
    const m=pn.match(new RegExp(o.regex));
    return m&&values[m[o.group]]?[{...o,values,default:m[o.group]}]:[];
  });
}
const DT_BACKSHELLS=dtBackshells();
const toMm=x=>Math.round(x*25.4*10)/10;
// Reference sizes for a housing: overall envelope, accepted insulation diameter, and reference-path hardware.
export function dimensionsFor(pn,h){
  const out={};
  if(!h)return out;
  if(h.family==='DT'&&/^DT0[46]-\d{1,2}[PS]$/.test(pn)){
    const row=dtDims.rows[h.cavities],v=row?.[h.role];
    if(v)out.overall={inches:{length:v[0],height:v[1],width:v[2]},mm:{length:toMm(v[0]),height:toMm(v[1]),width:toMm(v[2])},verification:row.verification||dtDims.verification,source:dtDims.source,source_url:dtDims.source_url};
  }
  if(insulationOD[h.family])out.insulation=insulationOD[h.family];
  const path=data.accessory_paths?.[h.accessory_path];
  if(path)out.reference=[['Adapter thread',path.adapter.thread],['Adapter boot land, max',path.adapter.boot_land_max_mm+' mm'],['Adapter cable entry, min',path.adapter.cable_entry_min_mm+' mm'],['Boot, expanded min / recovered max',path.boot.adapter_expanded_min_mm+' / '+path.boot.adapter_recovered_max_mm+' mm'],['Boot cable end, recovered max',path.boot.cable_recovered_max_mm+' mm'],...(h.panel_nut?[['Jam nut',path.panel_nut.description.split('·').pop().trim()]]:[])].map(([k,v])=>({label:k,value:v,source:path.adapter.source_url}));
  return out;
}
export const sealNote=h=>{const i=insulationOD[h.family];return i?` The rear seal is made for ${i.min}–${i.max} mm insulation${i.alt?` (${i.alt.name}: ${i.alt.min}–${i.alt.max} mm)`:''}.`:'';};
export const sizeText=d=>d.overall?`${d.overall.mm.length} L × ${d.overall.mm.width} W × ${d.overall.mm.height} H mm`:'';
// Backshells and rear accessories that fit a catalog housing.
export function backshellsFor(pn,h){
  if(!h||h.reference_path||h.ordering_candidate)return [];
  if(h.family==='DT'&&/^DT0[46]-\d{1,2}[PS]$/.test(pn))return DT_BACKSHELLS.filter(b=>b.cavities===h.cavities&&b.role===h.role);
  if(h.family==='D38999'&&/^D38999\/\d\d/.test(pn)&&shellNumber[h.shell_size])return d38999Backshells.map(b=>({...b,type:'backshell',pn:null,designation:`M85049${b.slash}-${shellNumber[h.shell_size]}`}));
  return [];
}
// Chooses the backshell for the person's answers. Returns null when the exit direction or need is still open.
export function pickBackshell(list,a){
  const want=a.shield?'shield':a.boot?'boot-adapter':'protect';
  const angle=a.exit==='straight'?0:a.exit==='right'?90:null;
  let fits=list.filter(b=>want==='protect'?b.kind==='strain'||b.kind==='basic':b.kind===want);
  if(want!=='boot-adapter')fits=fits.filter(b=>angle==null||b.angle===angle);
  if(want==='protect')fits.sort((x,y)=>((x.kind==='strain')===(a.jacket==='jacketed')?0:1)-((y.kind==='strain')===(a.jacket==='jacketed')?0:1));
  return {want,angle,fits,pick:angle==null&&want!=='boot-adapter'?null:fits[0]||null};
}
export function chosen(o,choices){return choices&&o.values[choices[o.id]]?choices[o.id]:o.default;}
const applyOption=(pn,o,v)=>o.kind==='suffix'?pn+v:pn.replace(new RegExp(o.regex),(...m)=>m.slice(1,1+new RegExp(o.regex+'|').exec('').length-1).map((g,i)=>i+1===o.group?v:g).join(''));
// The orderable part number for a catalog housing with the person's choices applied.
export function orderPart(pn,h,choices){return optionsForPart(pn,h).reduce((out,o)=>applyOption(out,o,chosen(o,choices)),pn);}
// Every orderable variant of a housing (used to allow exact stock checks on chosen variants).
export function partVariants(pn,h){
  let list=[pn];
  for(const o of optionsForPart(pn,h))list=list.flatMap(p=>Object.keys(o.values).map(v=>applyOption(p,o,v)));
  return [...new Set(list)];
}
// Finds the catalog housing behind a typed part number, including ordered variants (finish, keying, key color).
// Returns {pn, h, choices} where choices reproduce the typed number through orderPart, or null.
let variantIndex=null;
export function resolvePart(text){
  const q=String(text||'').trim().toUpperCase().replace(/\s+/g,'');
  if(!q)return null;
  if(!variantIndex){
    variantIndex=new Map();
    for(const [pn,h] of Object.entries(data.housings)){
      if(!h.cavity_profile)continue;
      let list=[[pn,{}]];
      for(const o of optionsForPart(pn,h))list=list.flatMap(([p,c])=>Object.keys(o.values).map(v=>[applyOption(p,o,v),{...c,[o.id]:v}]));
      for(const [p,c] of list)if(!variantIndex.has(p.toUpperCase()))variantIndex.set(p.toUpperCase(),{pn,h,choices:c});
    }
  }
  return variantIndex.get(q)||null;
}
export { data };
export const exactPart = pn => typeof pn === 'string' && /^[A-Za-z0-9][A-Za-z0-9/._-]*$/.test(pn);
export function validateWires(rows) {
  if (!rows.length) return 'Add at least one wire group.';
  if (rows.length > 30) return 'Use no more than 30 wire groups.';
  for (const r of rows) {
    if (!Number.isInteger(Number(r.count)) || Number(r.count)<1 || Number(r.count)>128) return 'Enter a whole number from 1 to 128 for each wire count.';
    if (!['power','signal','data','coax'].includes(r.kind)) return 'Choose what each group of wires carries.';
    if (r.kind==='coax' && !data.coax_cables?.[r.cable]) return 'Choose the coax cable type.';
    if (r.kind==='data' && !data.data_links?.[r.protocol]) return 'Choose the data link type.';
    if (!['coax','data'].includes(r.kind) && (!Number.isInteger(Number(r.awg)) || Number(r.awg)<12 || Number(r.awg)>28)) return 'Choose a wire size between 12 and 28 AWG.';
    for (const key of ['current','voltage']) if(r[key]!=='' && r[key]!=null && (!Number.isFinite(Number(r[key])) || Number(r[key])<0)) return 'Current and voltage must be positive numbers or zero.';
  }
  if (rows.reduce((n,r)=>n+Number(r.count),0)>128) return 'This prototype supports up to 128 wires in one connection.';
  const usb=rows.filter(r=>r.kind==='data'&&data.data_links?.[r.protocol]?.cavity);
  if (usb.length&&(rows.length>1||Number(usb[0].count)!==1)) return 'A rugged USB connector carries one USB port. Build the USB port as its own connection, and the other wires as another.';
  return '';
}
export function contactFor(h,size,awg,mm2) {
  const records=data.contact_records.filter(c=>c.family===h.family&&c.series===h.series&&c.termination===h.termination&&c.gender===h.gender&&c.size===size);
  if(records.length)return records.find(c=>(awg==null||(awg>=c.awg_range[0]&&awg<=c.awg_range[1]))&&(mm2===undefined||c.wire_mm2===mm2));
  const c=data.contacts[h.family]?.[h.gender];
  return c&&(awg==null||(awg>=c.awg_range[0]&&awg<=c.awg_range[1]))?c:null;
}
// A wire is an AWG number, or a token: 'coax:<cable>' or 'data:<protocol>'.
export const wireToken=r=>r.kind==='coax'?'coax:'+r.cable:r.kind==='data'?'data:'+r.protocol:r.mm2?'wire:'+Number(r.awg)+':'+r.mm2:Number(r.awg);
function accepts(h, size, awg) {
  // Area is resolved in the BOM. Missing or unsupported area must not hide insert candidates.
  if(typeof awg==='string'&&awg.startsWith('wire:'))awg=Number(awg.split(':')[1]);
  if(typeof awg==='string'){
    const [kind,v]=[awg.slice(0,awg.indexOf(':')),awg.slice(awg.indexOf(':')+1)];
    if(kind==='coax'){const c=data.coax_cables?.[v];return !!(c&&c.families.includes(h.family)&&c.contacts[size]);}
    if(kind==='data')return !!v&&data.data_links?.[v]?.cavity===size;
    return false;
  }
  const generic=data.contact_sizes[size];
  if(!generic?.awg_range)return false;
  if(!generic || awg<generic.awg_range[0] || awg>generic.awg_range[1]) return false;
  const recorded=data.contacts[h.family]||data.contact_records.some(c=>c.family===h.family&&c.series===h.series);
  return !recorded || !!contactFor(h,size,awg);
}
// Exact bipartite matching: a wire can move to another valid cavity to make room.
export function fitHousing(h, rows) {
  const cavities=Object.entries(h.cavity_profile||{}).flatMap(([size,n])=>Array(n).fill(size));
  const wires=rows.flatMap(r=>Array(Number(r.count)).fill(wireToken(r)));
  const owner=Array(cavities.length).fill(-1);
  function place(w,seen) {
    for(let c=0;c<cavities.length;c++) {
      if(seen.has(c)||!accepts(h,cavities[c],wires[w])) continue;
      seen.add(c);
      if(owner[c]<0 || place(owner[c],seen)) {owner[c]=w;return true;}
    }
    return false;
  }
  for(let w=0;w<wires.length;w++) if(!place(w,new Set())) return null;
  const assigned={},spares={};
  cavities.forEach((s,c)=>{
    if(owner[c]<0) spares[s]=(spares[s]||0)+1;
    else {const key=s+':'+wires[owner[c]];assigned[key]=(assigned[key]||0)+1;}
  });
  return {assigned,spares,spare:Object.values(spares).reduce((a,b)=>a+b,0)};
}
// Both halves of a connection must come from the same source. A housing's own manufacturer wins;
// otherwise the family default applies. Unbranded standard part numbers only mate with each other.
export const sourceOf=h=>h?.manufacturer||data.families[h?.family]?.manufacturer||null;
export const sourceLabel=h=>sourceOf(h)||data.families[h?.family]?.unbranded_label||'Manufacturer not recorded';
export function mates(pn) {
  const h=data.housings[pn];if(!h)return [];
  const keys=data.families[h.family].match_on;
  if(keys.some(k=>h[k]==null))return [];
  return Object.entries(data.housings).filter(([other,m])=>other!==pn&&h.role!==m.role&&((h.gender==='pin'&&m.gender==='socket')||(h.gender==='socket'&&m.gender==='pin'))&&keys.every(k=>m[k]!=null&&h[k]===m[k])&&sourceOf(m)===sourceOf(h));
}
export function optionsFor(s) {
  if(validateWires(s.wires)||s.wires.some(r=>r.kind==='data'&&!data.data_links?.[r.protocol]?.cavity))return [];
  const source=s.scope==='existing'?mates(s.existing):Object.entries(data.housings);
  const options=[];
  for(const [pn,h] of source) {
    const fam=data.families[h.family]||{};
    if(s.family!=='any'&&h.family!==s.family&&!(fam.shown_with||[]).includes(s.family))continue;
    if(s.family==='any'&&fam.in_compare===false)continue;
    if(s.scope==='pair'&&h.role!==(fam.end_a_role||'receptacle'))continue;
    // Families with separate shells (hoods/housings) mount through the shell, so any connection style works.
    if(!fam.shells&&s.scope!=='existing'&&s.connection==='panel'&&!['flange','panel','jam-nut','box'].includes(h.mount))continue;
    if(!fam.shells&&s.scope!=='existing'&&s.connection==='cables'&&h.mount!=='inline')continue;
    const fit=fitHousing(h,s.wires);if(!fit||fit.spare<Number(s.spare||0))continue;
    let mate=null;
    if(s.scope==='pair') {
      mate=mates(pn).filter(([,m])=>fitHousing(m,s.wires)&&(s.connection!=='cables'||m.mount==='inline'||fam.shells)).sort((a,b)=>(a[1].reference_path===h.reference_path?0:1)-(b[1].reference_path===h.reference_path?0:1)||a[0].localeCompare(b[0]))[0];
      if(!mate)continue;
    }
    options.push({pn,h,fit,mate});
  }
  // Source-checked parts rank first: count halves (this one plus its mate) that are not verified.
  // Only then prefer fewer unused positions. Spare count must never promote a guessed part number.
  const unverified=o=>(o.h.verification==='verified'?0:1)+(o.mate&&o.mate[1].verification!=='verified'?1:0);
  return options.sort((a,b)=>unverified(a)-unverified(b)||a.fit.spare-b.fit.spare||a.pn.localeCompare(b.pn));
}
export function endpoints(option,s) {
  const ends=[{label:s.scope==='existing'?'New mating half':'End A',pn:option.pn,h:option.h}];
  if(s.scope==='pair'&&option.mate)ends.push({label:'End B',pn:option.mate[0],h:option.mate[1]});
  return ends;
}
export function shellAssemblyChoices(option,s) {
  return (data.families[option?.h.family]?.shell_assemblies||[]).filter(p=>
    s.scope===p.scope&&s.connection===p.connection&&option.pn===p.inserts[0]&&option.mate?.[0]===p.inserts[1]);
}
export function shellAssemblyChecks(option,s) {
  const assembly=shellAssemblyChoices(option,s).find(p=>p.id===s.accessories.shellAssembly);
  if(!assembly)return {assembly:null,valid:false,problems:['Choose a documented hood and panel housing arrangement.']};
  const a=s.accessories,problems=[];
  if(!assembly.mounts.includes(s.mount))problems.push('This arrangement uses a flange-mounted bulkhead housing, not a jam nut.');
  if(a.exit!==assembly.exit)problems.push('This hood has straight top entry. Choose straight or leave the hood unresolved.');
  if(a.shield||s.shielding==='yes')problems.push('Shield termination needs a documented EMC hood and gland; this arrangement does not provide it.');
  if(a.boot)problems.push('No heat-shrink boot is documented for this arrangement.');
  if(Object.values(assembly.ends).some(e=>e.shell.shell_size!==option.h.shell_size||e.shell.locking!==assembly.locking||e.gland&&e.shell.thread!==e.gland.thread))problems.push('The recorded shell size, lock or cable-entry thread does not match.');
  return {assembly,valid:problems.length===0,problems};
}
export function capForEnd(option,s,end) {
  if(!data.families[end.h.family]?.shells)return capFor(end.pn);
  const c=shellAssemblyChecks(option,s);
  return c.valid?c.assembly.ends[end.label]?.cap:null;
}
export function glandChecks(assembly,s,label) {
  const gland=assembly?.ends[label]?.gland;
  if(!gland)return null;
  const a=s.accessories,range=gland.seals[a.glandSeal],diameter=Number(a[label==='End B'?'diameterB':'diameterA']),problems=[];
  if(a.jacket!==gland.jacket)problems.push('Confirm one round jacketed cable; a gland does not seal individual loose wires.');
  if(!range)problems.push('Choose the gland seal range: 5–9 mm or 6–12 mm.');
  if(!Number.isFinite(diameter)||diameter<=0)problems.push('Enter the finished cable outside diameter.');
  else if(range&&(diameter<range[0]||diameter>range[1]))problems.push(`Cable diameter must be within the selected ${range[0]}–${range[1]} mm seal range.`);
  return {gland,valid:problems.length===0,problems};
}
export function buildBOM(option,s) {
  const lines=[]; const builds=Number(s.builds);
  const add=(end,qty,pn,description,verification,reason,source='',category='Assembly')=>lines.push({end,qty,total:qty*builds,pn,description,verification,reason,source,category});
  const enclosure=shellAssemblyChecks(option,s);
  const addPart=(label,p)=>{add(label,1,p.pn,p.description,p.verification,p.reason,p.source);Object.assign(lines.at(-1),{source_url:p.source_url,manufacturer:p.manufacturer});};
  for(const end of endpoints(option,s)) {
    const {h,pn,label}=end;const fit=fitHousing(h,s.wires);if(!fit)throw Error('The selected assembly no longer fits these wires.');
    const opts=optionsForPart(pn,h),ordered=orderPart(pn,h,s.options);
    add(label,1,h.ordering_incomplete?null:ordered,h.role?.endsWith('insert')?'Connector insert':'Connector housing',h.verification,h.ordering_candidate?'Inline receptacle ordering-code candidate. Confirm available insert arrangement, mating interface and accessories with Glenair before ordering.':h.reference_path?'Glenair ordering-code configuration: nickel finish, A98, normal keying; A/B suffixes specify no standard contacts. Check orderability and application requirements.':h.description?`${h.description}. Selected for the entered wire sizes. Crimp contacts are ordered separately. Other application requirements need review.`:'Selected for the entered wire sizes and mounting arrangement. Other application requirements need review.',h.source);
    lines.at(-1).source_url=h.source_url;
    lines.at(-1).manufacturer=sourceLabel(h);
    if(h.protective_earth)lines.at(-1).reason+=' '+h.protective_earth.description;
    if(h.ordering_incomplete){lines.at(-1).designation=h.designation;lines.at(-1).reason=`${h.description}. ${data.families[h.family].ordering_note||'Complete the ordering code from the manufacturer catalog.'}`;}
    {const d=dimensionsFor(pn,h);if(d.overall){lines.at(-1).reason+=` Reference size ${sizeText(d)} (TE, reference only${d.overall.verification==='verified'?'':'; confirm on the drawing'}).`;lines.at(-1).dimensions=d.overall.mm;}}
    if(opts.length){const picks=opts.map(o=>{const v=chosen(o,s.options),d=o.values[v];return `${o.label}: ${v}${d.label?' ('+d.label+')':d.finish?' ('+d.material+', '+d.finish+')':''}`;});
      lines.at(-1).reason+=' '+picks.join('; ')+'.'+(opts.some(o=>o.both)&&s.scope!=='existing'?' Both halves use the same key.':opts.some(o=>o.both)?' Match the key letter of the connector you already have.':'');
      if(opts.some(o=>o.id==='finish'))lines.at(-1).reason+=' Confirm the finish is offered for this shell type.';
      lines.at(-1).option_source=opts.map(o=>o.source).join(' | ');}
    if(h.wedgelock)add(label,1,h.wedgelock,'Contact retaining wedge',h.verification,'Retains the contacts in this housing. Status inherited from the housing record.',h.source);
    for(const [key,n] of Object.entries(fit.assigned)) {
      const size=key.slice(0,key.indexOf(':')),awg=key.slice(key.indexOf(':')+1);
      if(awg.startsWith('data:'))continue; // USB contacts are built into the connector
      if(awg.startsWith('coax:')){
        const c=data.coax_cables[awg.slice(5)],cc=c.contacts[size];
        add(label,n,cc[h.gender],`Size ${size} coax ${h.gender} contacts · ${c.label}`,c.verification,`AS39029 coax contact for ${c.label} (${cc.vendor}), rated to ${c.max_freq} by the manufacturer. Use the manufacturer's coax crimp and assembly tools.`,c.source);
        lines.at(-1).source_url=c.source_url;continue;
      }
      const [,wireAwg,mm2]=awg.startsWith('wire:')?awg.split(':'):['',awg,undefined];
      const areaRequired=data.families[h.family]?.requires_conductor_area;
      const contact=contactFor(h,size,Number(wireAwg),areaRequired?(mm2||''):undefined);
      add(label,n,contact?.pn||null,`${data.contact_sizes[size]?.label||'Size '+size} ${h.gender} contacts · ${wireAwg} AWG`,contact?.verification||'unknown',contact?(exactPart(contact.pn)?'Contact size, gender, series and documented wire range checked. Confirm finished insulation diameter and installation requirements.'+sealNote(h):'Wire range checked against this record. Resolve the plating suffix before ordering.'+sealNote(h)):areaRequired?'Confirm the conductor area from the cable specification in Your wires. No contact is chosen from approximate AWG conversion alone.':'Exact compatible contact part number is not in the catalog.',contact?.source);
      lines.at(-1).source_url=contact?.source_url;
      if(contact?.wire_mm2)lines.at(-1).description+=` (${contact.wire_mm2} mm²)`;
      if(contact?.note)lines.at(-1).reason+=' '+contact.note;
      if(contact&&h.contacts_supplied!==false)lines.at(-1).reason+=' Check whether the supplier already includes these contacts.';
    }
    const shells=data.families[h.family]?.shells;
    if(shells){
      const what=(shells[s.scope==='existing'?'existing':s.connection]||shells.panel)[label]||'Hood or housing';
      if(enclosure.valid)addPart(label,enclosure.assembly.ends[label].shell);
      else add(label,1,null,`${what} · Han size ${h.shell_size}`,'unknown',shells.note.replace('{size}',h.shell_size)+' '+enclosure.problems.join(' '));
    }
    if(fit.spare&&data.families[h.family]?.unused_cavity_seals===false)add(label,0,null,`${fit.spare} unused position${fit.spare>1?'s':''}`,'verified','No per-cavity sealing plugs: the hood or housing gasket and cable gland seal this connector. Leave the positions empty or use them as spares.');
    for(const [size,n] of Object.entries(data.families[h.family]?.unused_cavity_seals===false?{}:fit.spares)) {
      const plug=data.size_sealing_plugs[h.family]?.[size]||data.sealing_plugs[h.family];
      add(label,n,plug?.pn||null,`Unused-cavity seals · size ${size}`,plug?.verification||'unknown','Close the unused positions. Confirm the family-specific sealing assembly and installation instructions.');
      lines.at(-1).source_url=plug?.source_url;
      if(data.unused_contact_rules[h.family]?.required){const c=contactFor(h,size);add(label,n,c?.pn||null,`Uncrimped ${h.gender} contacts · unused size ${size} positions`,c?.verification||'unknown','The installation instructions require an uncrimped contact behind each unused-cavity sealing plug.',c?.source);lines.at(-1).source_url=data.unused_contact_rules[h.family].source_url;}
    }
    const a=s.accessories;
    if(wantsCap(s,label)){
      const cap=capForEnd(option,s,end);
      add(label,1,cap?.pn||null,'Dust cap / protective cover',cap?'verified':'unknown',cap?.reason||'A dust cap is requested for this half. No manufacturer-matched cap is recorded for this exact housing yet.',cap?.source);
      lines.at(-1).source_url=cap?.source_url;if(cap?.manufacturer)lines.at(-1).manufacturer=cap.manufacturer;
    }
    const path=data.accessory_paths[h.accessory_path];
    if(path){
      const checks=accessoryChecks(h,s,label);
      if(a.protection||a.boot||a.shield){const valid=checks.base;add(label,1,valid?path.adapter.pn:null,'Boot-compatible adapter / backshell',valid?'verified':'unknown',valid?'Manufacturer H interface, size 09 and nickel finish match this connector. Separate adapter only: no boot included.':checks.problems.join(' '),valid?path.adapter.source:'');lines.at(-1).source_url=valid?path.adapter.source_url:undefined;}
      if(a.boot){const valid=checks.boot;add(label,1,valid?path.boot.pn:null,'Heat-shrink boot · straight',valid?'verified':'unknown',valid?'Manufacturer pairs size-9 adapter with size-02 boot. Type 1 / W1 and entered cable diameter pass the limited dimensional screen; sealing and application review remain.':checks.problems.join(' '),valid?path.boot.source:'');lines.at(-1).source_url=valid?path.boot.source_url:undefined;}
      if(a.shield)add(label,1,null,'Shield termination hardware','unknown','This reference adapter has no modeled shield termination. Select a documented shielding assembly.');
      if(h.panel_nut){add(label,1,path.panel_nut.pn,'Panel jam nut',path.panel_nut.verification,a.panelHardware==='separate'?'Purchase separately, as selected. Confirm the connector supplier does not already include it.':a.panelHardware==='included'?'User confirmed this nut is included with the connector; no additional purchase.':'Exact nut identified. Confirm whether supplied with the connector before setting a purchase quantity.',path.panel_nut.source);lines.at(-1).source_url=path.panel_nut.source_url;lines.at(-1).total=a.panelHardware==='included'?0:a.panelHardware==='separate'?builds:null;}
      continue;
    }
    const viaShell=!!data.families[h.family]?.shells;
    if(viaShell){
      const gland=glandChecks(enclosure.assembly,s,label);
      // Bulkhead End A has no cable entry. Every cable end needs its gland, even with protection unchecked.
      if(gland&&enclosure.valid&&gland.valid){addPart(label,gland.gland);lines.at(-1).reason+=` Selected seal range: ${a.glandSeal} mm; cable: ${a[label==='End B'?'diameterB':'diameterA']} mm.`;}
      else if(s.scope==='existing'||s.connection==='cables'||label==='End B')add(label,1,null,'Cable entry / gland for the hood','unknown',[...enclosure.problems,...(gland?.problems||['Choose the hood entry thread and a gland for the cable diameter.'])].join(' '));
      if(a.boot)add(label,1,null,'Heat-shrink boot requirement','unknown','No boot and adapter combination is documented for this hood.');
      if(a.shield||s.shielding==='yes')add(label,1,null,'Shield termination hardware','unknown','Select a documented EMC enclosure and gland assembly.');
    }
    if(!viaShell&&(a.protection||a.boot||a.shield)) {
      const {want,angle,fits,pick}=pickBackshell(backshellsFor(pn,h),a);
      const title=a.boot?'Boot-compatible adapter / backshell':a.shield?'Shield-termination backshell':'Cable-protection backshell';
      if(pick){
        const others=fits.filter(b=>b!==pick).map(b=>`${b.kind==='strain'?'strain-relief version':'version without strain relief'} ${b.pn||b.designation}`);
        const reason=pick.pn?`${pick.desc}. ${pick.note}${others.length?' Also available: '+others.join(', ')+'.':''} Confirm cable size and fit.`
          :`${pick.desc}: ${pick.designation}. Add the finish letter (match the connector finish) and, where the slash sheet offers it, the self-locking and cable-clamp options before ordering.`;
        add(label,1,pick.pn,title,pick.verification,reason,pick.source);
        lines.at(-1).source_url=pick.source_url;if(pick.designation)lines.at(-1).designation=pick.designation;
      }else add(label,1,null,title,'unknown',fits.length&&angle==null&&want!=='boot-adapter'?`Choose a straight or 90° cable exit. Available: ${fits.map(b=>b.pn||b.designation).join(', ')}.`
        :want==='shield'&&h.family==='D38999'&&angle===90?'No 90° shield-termination backshell is recorded yet (straight and 45° are). Choose a documented shielding backshell.'
        :'Select a documented interface and cable-entry match. Current catalog has no validated match for these requirements.');
    }
    if(a.boot&&!viaShell)add(label,1,null,`Heat-shrink boot · ${a.exit==='right'?'90°':a.exit==='straight'?'straight':'exit to confirm'}`,'unknown',`Cable diameter: ${a[label==='End B'?'diameterB':'diameterA']||'not provided'} mm. Adapter diameter, boot geometry, material and adhesive compatibility must be established.`);
    if(a.shield&&!viaShell)add(label,1,null,'Shield termination hardware','unknown','Band, braid trap or other termination must match the chosen backshell system.');
    if(s.connection==='panel'&&label!=='End B'&&s.scope!=='existing')add(label,1,null,'Panel mounting hardware / seal set','unknown','Confirm included hardware, panel thickness, mounting pattern and sealing requirements.');
  }
  if(s.accessories.tools) {
    const tools=option.h.reference_path?data.reference_tools:data.accessories_catalog[option.h.family]?.filter(x=>x.type==='tool')||[];
    if(tools.length)for(const t of tools)lines.push({end:'Tools',qty:1,total:1,pn:t.pn,description:t.desc,verification:t.verification,reason:'One tool, not one per connection. Confirm contact-specific tooling, locator and settings.',source:t.source,source_url:t.source_url,category:'Tools'});
    else lines.push({end:'Tools',qty:1,total:1,pn:null,description:'Crimp tool, locator and insertion / extraction tools',verification:'unknown',reason:'Tooling depends on the final contact selection.',category:'Tools'});
  }
  return lines;
}
export function reviewIssues(option,s,lines) {
  const issues=['Current, voltage, insulation diameter, environmental ratings and material suitability have not been validated by this prototype.','Use the Mouser lookup below to check availability. Stock and pricing are separate from compatibility approval.'];
  if(lines.some(l=>l.qty>0&&!exactPart(l.pn)))issues.push('Some required selections have no exact part number, or contain a plating wildcard.');
  if(option.h.protective_earth)issues.push(option.h.protective_earth.description+' '+(s.protectiveEarth==='separate'?'PE is recorded separately from the circuit wires.':'PE conductor requirements have not been confirmed.'));
  if(lines.some(l=>l.verification!=='verified'))issues.push('Some catalog records are inferred or unknown and require source verification.');
  if(s.accessories.boot)issues.push(option.h.reference_path?'The boot dimensional screen is limited to the documented reference combination. Confirm cable-jacket adhesion, installation, temperature and environmental suitability.':'Boot and adapter compatibility must be established from drawings, including cable diameter, sealing surfaces, material and adhesive.');
  if(lines.some(l=>l.total==null))issues.push('Confirm whether the jam nut is included before setting its purchase quantity.');
  issues.push('Confirm package contents to avoid buying contacts or accessories already supplied with a connector.');
  return issues;
}
export function csv(lines) {
  const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  return [['End','Description','Manufacturer','Part number','Qty per connection','Purchase quantity','Catalog status','Availability','Reason','Source'],...lines.map(l=>[l.end,l.description,l.manufacturer||'',l.pn||(l.qty===0?'Not required':'Unresolved'),l.qty,l.total??'Confirm included contents',l.verification,'Not checked',l.reason,l.source_url||l.source])].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function accessoryChecks(h,s,label='End A'){
  const p=data.accessory_paths[h.accessory_path];if(!p)return null;
  const a=s.accessories,d=Number(a[label==='End B'?'diameterB':'diameterA']);
  const problems=[];
  if(a.exit!==p.exit)problems.push('Only the straight exit is documented in this reference path.');
  if(a.shield||s.shielding==='yes')problems.push('Shield termination needs a different adapter.');
  if(a.jacket!==p.jacket)problems.push('Confirm a jacketed cable for this reference assembly.');
  if(!Number.isFinite(d)||d<p.prototype_cable_range_mm[0]||d>p.prototype_cable_range_mm[1])problems.push('Enter a cable diameter from 4 to 6 mm for this limited prototype screen.');
  const base=problems.length===0;
  if(a.boot&&(a.bootMaterial!=='type1w1'||a.adhesive!=='precoat'))problems.push('Choose Type 1 elastomer with W1 adhesive to use the documented boot.');
  return {base,boot:base&&(!a.boot||(a.bootMaterial==='type1w1'&&a.adhesive==='precoat')),problems};
}
