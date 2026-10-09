const te='https://www.te.com/content/dam/te-com/documents/industrial-and-commercial-transportation/global/DEUTSCH%20Product%20Catalog.pdf';
const glenair='https://www.glenair.com/mil-spec/mil-dtl-38999-qualified-connector-accessories/pdf/d38999-32-and-d38999-33.pdf';
const matches={
 'DT04-3P':'DT3P-DC','DT04-4P':'DT4P-DC','DT04-6P':'DT6P-DC','DT04-12P':'DT12P-DC',
 'DT06-2S':'1011-344-0205','DT06-3S':'1011-345-0305','DT06-4S':'1011-346-0405','DT06-6S':'1011-347-0605','DT06-8S':'1011-348-0805','DT06-08S':'1011-348-0805','DT06-12S':'1011-349-1205',
 'DTM06-3S':'DTM3S-DC','DTM04-12P':'DTM12P-DC'
};
export function capFor(pn){
 if(matches[pn])return {pn:matches[pn],source_url:te,source:'TE DEUTSCH catalog, printed p. 50 / PDF p. 52; checked 2026-09-09',reason:matches[pn].startsWith('1011-')?'Manufacturer lists this thermoplastic cap for the selected plug. Confirm the required unmated environmental protection.':'Manufacturer lists this plastisol cap for temporary dust, dirt and paint protection. Do not treat it as a rated waterproof closure.'};
 const ref={'D38999/24FA98BN':'D38999/33F9R','D38999/26FA98AN':'D38999/32F9R'};
 if(ref[pn])return {pn:ref[pn],source_url:glenair,source:'Glenair D38999/32 and /33 drawing, p. C-6; checked 2026-09-09',reason:'Series III cover ordering configuration: size 9, nickel aluminum, attachment style R. Includes the illustrated rope attachment and gasket; confirm its anchoring, clearance and supplier contents. Stock is not checked.'};
 return null;
}
export function wantsCap(s,label){return !!s.accessories.cap&&(s.scope==='existing'||!s.accessories.capEnds||s.accessories.capEnds==='both'||s.accessories.capEnds===(label==='End B'?'b':'a'));}
