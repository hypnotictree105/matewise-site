import {capFor,wantsCap} from './dust-caps.js';
import data from './catalog.js';
import {extendCatalog} from './reference-data.js';
extendCatalog(data);
export { data };
export const exactPart = pn => typeof pn === 'string' && /^[A-Za-z0-9][A-Za-z0-9/._-]*$/.test(pn);
export function validateWires(rows) {
  if (!rows.length) return 'Add at least one wire group.';
  if (rows.length > 30) return 'Use no more than 30 wire groups.';
  for (const r of rows) {
    if (!Number.isInteger(Number(r.count)) || Number(r.count)<1 || Number(r.count)>128) return 'Enter a whole number from 1 to 128 for each wire count.';
    if (!Number.isInteger(Number(r.awg)) || Number(r.awg)<12 || Number(r.awg)>28) return 'Choose a wire size between 12 and 28 AWG.';
    if (!['power','signal','data','coax'].includes(r.kind)) return 'Choose what each group of wires carries.';
    for (const key of ['current','voltage']) if(r[key]!=='' && r[key]!=null && (!Number.isFinite(Number(r[key])) || Number(r[key])<0)) return 'Current and voltage must be positive numbers or zero.';
  }
  if (rows.reduce((n,r)=>n+Number(r.count),0)>128) return 'This prototype supports up to 128 wires in one connection.';
  return '';
}
export function contactFor(h,size,awg) {
  const records=data.contact_records.filter(c=>c.family===h.family&&c.series===h.series&&c.termination===h.termination&&c.gender===h.gender&&c.size===size);
  if(records.length)return records.find(c=>awg==null||(awg>=c.awg_range[0]&&awg<=c.awg_range[1]));
  const c=data.contacts[h.family]?.[h.gender];
  return c&&(awg==null||(awg>=c.awg_range[0]&&awg<=c.awg_range[1]))?c:null;
}
function accepts(h, size, awg) {
  const generic=data.contact_sizes[size];
  if(!generic || awg<generic.awg_range[0] || awg>generic.awg_range[1]) return false;
  const recorded=data.contacts[h.family]||data.contact_records.some(c=>c.family===h.family&&c.series===h.series);
  return !recorded || !!contactFor(h,size,awg);
}
// Exact bipartite matching: a wire can move to another valid cavity to make room.
export function fitHousing(h, rows) {
  const cavities=Object.entries(h.cavity_profile||{}).flatMap(([size,n])=>Array(n).fill(size));
  const wires=rows.flatMap(r=>Array(Number(r.count)).fill(Number(r.awg)));
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
  if(validateWires(s.wires)||s.wires.some(r=>['data','coax'].includes(r.kind)))return [];
  const source=s.scope==='existing'?mates(s.existing):Object.entries(data.housings);
  const options=[];
  for(const [pn,h] of source) {
    if(s.family!=='any'&&h.family!==s.family)continue;
    if(s.scope==='pair'&&h.role!=='receptacle')continue;
    if(s.scope!=='existing'&&s.connection==='panel'&&!['flange','panel','jam-nut','box'].includes(h.mount))continue;
    if(s.scope!=='existing'&&s.connection==='cables'&&h.mount!=='inline')continue;
    const fit=fitHousing(h,s.wires);if(!fit||fit.spare<Number(s.spare||0))continue;
    let mate=null;
    if(s.scope==='pair') {
      mate=mates(pn).filter(([,m])=>fitHousing(m,s.wires)&&(s.connection!=='cables'||m.mount==='inline')).sort((a,b)=>(a[1].reference_path===h.reference_path?0:1)-(b[1].reference_path===h.reference_path?0:1)||a[0].localeCompare(b[0]))[0];
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
export function buildBOM(option,s) {
  const lines=[]; const builds=Number(s.builds);
  const add=(end,qty,pn,description,verification,reason,source='',category='Assembly')=>lines.push({end,qty,total:qty*builds,pn,description,verification,reason,source,category});
  for(const end of endpoints(option,s)) {
    const {h,pn,label}=end;const fit=fitHousing(h,s.wires);if(!fit)throw Error('The selected assembly no longer fits these wires.');
    add(label,1,pn,'Connector housing',h.verification,h.ordering_candidate?'Inline receptacle ordering-code candidate. Confirm available insert arrangement, mating interface and accessories with Glenair before ordering.':h.reference_path?'Glenair ordering-code configuration: nickel finish, A98, normal keying; A/B suffixes specify no standard contacts. Check orderability and application requirements.':'Selected for the entered wire sizes and mounting arrangement. Other application requirements need review.',h.source);
    lines.at(-1).source_url=h.source_url;
    lines.at(-1).manufacturer=sourceLabel(h);
    if(h.wedgelock)add(label,1,h.wedgelock,'Contact retaining wedge',h.verification,'Retains the contacts in this housing. Status inherited from the housing record.',h.source);
    for(const [key,n] of Object.entries(fit.assigned)) {
      const [size,awg]=key.split(':');
      const contact=contactFor(h,size,Number(awg));
      add(label,n,contact?.pn||null,`Size ${size} ${h.gender} contacts · ${awg} AWG`,contact?.verification||'unknown',contact?(exactPart(contact.pn)?'Contact size, gender, series and documented wire range checked. Confirm finished insulation diameter and installation requirements.':'Wire range checked against this record. Resolve the plating suffix before ordering.'):'Exact compatible contact part number is not in the catalog.',contact?.source);
      lines.at(-1).source_url=contact?.source_url;
      if(contact&&h.contacts_supplied!==false)lines.at(-1).reason+=' Check whether the supplier already includes these contacts.';
    }
    for(const [size,n] of Object.entries(fit.spares)) {
      const plug=data.size_sealing_plugs[h.family]?.[size]||data.sealing_plugs[h.family];
      add(label,n,plug?.pn||null,`Unused-cavity seals · size ${size}`,plug?.verification||'unknown','Close the unused positions. Confirm the family-specific sealing assembly and installation instructions.');
      lines.at(-1).source_url=plug?.source_url;
      if(data.unused_contact_rules[h.family]?.required){const c=contactFor(h,size);add(label,n,c?.pn||null,`Uncrimped ${h.gender} contacts · unused size ${size} positions`,c?.verification||'unknown','The installation instructions require an uncrimped contact behind each unused-cavity sealing plug.',c?.source);lines.at(-1).source_url=data.unused_contact_rules[h.family].source_url;}
    }
    const a=s.accessories;
    if(wantsCap(s,label)){
      const cap=capFor(pn);
      add(label,1,cap?.pn||null,'Dust cap / protective cover',cap?'verified':'unknown',cap?.reason||'A dust cap is requested for this half. No manufacturer-matched cap is recorded for this exact housing yet.',cap?.source);
      lines.at(-1).source_url=cap?.source_url;
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
    const cat=data.accessories_catalog[h.family]||[];
    if(a.protection||a.boot||a.shield) {
      const available=cat.filter(x=>x.type==='backshell'&&Array.isArray(x.fits)&&x.fits.includes(pn));
      const selected=(!a.boot&&!a.shield)?available.find(x=>a.exit==='straight'?x.desc.includes('straight'):a.exit==='right'?x.desc.includes('right-angle'):false):null;
      add(label,1,selected?.pn||null,a.boot?'Boot-compatible adapter / backshell':a.shield?'Shield-termination backshell':'Cable-protection backshell',selected?.verification||'unknown',selected?'Catalog lists this housing; cable dimensions and application suitability still need checking.':'Select a documented interface and cable-entry match. Current catalog has no validated match for these requirements.',selected?.source);
    }
    if(a.boot)add(label,1,null,`Heat-shrink boot · ${a.exit==='right'?'90°':a.exit==='straight'?'straight':'exit to confirm'}`,'unknown',`Cable diameter: ${a[label==='End B'?'diameterB':'diameterA']||'not provided'} mm. Adapter diameter, boot geometry, material and adhesive compatibility must be established.`);
    if(a.shield)add(label,1,null,'Shield termination hardware','unknown','Band, braid trap or other termination must match the chosen backshell system.');
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
  if(lines.some(l=>!exactPart(l.pn)))issues.push('Some required selections have no exact part number, or contain a plating wildcard.');
  if(lines.some(l=>l.verification!=='verified'))issues.push('Some catalog records are inferred or unknown and require source verification.');
  if(s.accessories.boot)issues.push(option.h.reference_path?'The boot dimensional screen is limited to the documented reference combination. Confirm cable-jacket adhesion, installation, temperature and environmental suitability.':'Boot and adapter compatibility must be established from drawings, including cable diameter, sealing surfaces, material and adhesive.');
  if(lines.some(l=>l.total==null))issues.push('Confirm whether the jam nut is included before setting its purchase quantity.');
  issues.push('Confirm package contents to avoid buying contacts or accessories already supplied with a connector.');
  return issues;
}
export function csv(lines) {
  const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  return [['End','Description','Manufacturer','Part number','Qty per connection','Purchase quantity','Catalog status','Availability','Reason','Source'],...lines.map(l=>[l.end,l.description,l.manufacturer||'',l.pn||'Unresolved',l.qty,l.total??'Confirm included contents',l.verification,'Not checked',l.reason,l.source_url||l.source])].map(row=>row.map(cell).join(',')).join('\r\n');
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
