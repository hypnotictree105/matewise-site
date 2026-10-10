// Facts transcribed and visually checked against the linked manufacturer PDFs on 2026-09-08.
// Ordering-code configurations are distinguished from stocked, individually listed SKUs.
const base='https://www.glenair.com/mil-dtl-38999-connector-series-iii/pdf/';
export const sources={
  plug:base+'mil-dtl-38999-series-iii-environmental/d38999-26.pdf',
  receptacle:base+'mil-dtl-38999-series-iii-environmental/d38999-24.pdf',
  flange:base+'mil-dtl-38999-series-iii-environmental/d38999-20.pdf',
  arrangements:base+'mil-std-1560-standard-power-and-signal-contact-arrangements.pdf',
  pins:base+'series-iii-and-iv-pin-contact-selection-guide-for-environmental-connectors.pdf',
  sockets:base+'series-iii-and-iv-socket-contact-selection-guide.pdf',
  tools:base+'contact-crimp-and-installation-tools.pdf',
  adapter:'https://www.glenair.com/circular-connector-backshells-and-accessories/series-31-shrink-boot-adapter/pdf/310h-001.pdf',
  boot:'https://www.glenair.com/environmental-shrink-boots/lipped/pdf/straight-boots/770-003s.pdf',
  nut:'https://www.glenair.com/mil-spec/mil-dtl-38999-qualified-connector-accessories/pdf/d38999-28.pdf',
  installation:'https://www.amphenol-aerospace.com/resources/terminationinstructions/view/l-624'
};
const checked=(url,page)=>({verification:'verified',source:`Manufacturer document, ${page}; checked 2026-09-08`,source_url:url,checked_at:'2026-09-08'});
export const referenceId='size9-straight';
export const referenceParts={receptacle:'D38999/24FA98BN',plug:'D38999/26FA98AN',adapter:'310HS001M09',boot:'770-003S102W1',nut:'D38999/28-1F'};
export function extendCatalog(data){
  // Manufacturer ordering-code candidates, NOT confirmed stocked SKUs. The drawing
  // explicitly requires factory confirmation of available insert arrangements.
  const shells={A:9,B:11,C:13,D:15,E:17,F:19,G:21,H:23,J:25};
  for(const [pn,h] of Object.entries(data.housings)){
    if(!pn.startsWith('D38999/24W')||!h.cavity_profile||!shells[h.shell_size])continue;
    const arrangement=h.insert_arrangement.replace(/^[A-HJ]/,'');
    const inline=`233-105-05NF${shells[h.shell_size]}-${arrangement}SN`;
    data.housings[inline]={...h,mount:'inline',shell_type:'05',manufacturer:'Glenair',verification:'inferred',ordering_candidate:true,source:'Glenair 233-105-05, pp. D-16–D-17. Ordering-code candidate; factory must confirm insert availability. Existing layout data retained.',source_url:'https://www.glenair.com/mil-dtl-38999/series-i-ii-and-iii-environmental-class-connectors/pdf/233-105-05.pdf'};
  }
  // Amphenol Tri-Start (TV): Amphenol's own Series III line, with its own line (in-line) receptacle, shell style 01,
  // and straight plug, style 06. Both halves come from Amphenol, so a cable-to-cable pair stays one manufacturer.
  // Built from the ordering code (p. 43); Amphenol's insert availability per shell size was not checked.
  const tvSource='Amphenol Aerospace Tri-Start (TV) catalog, p. 43 ordering information: TV, shell style 01 line receptacle / 06 straight plug, service class, shell size 9-25, MIL-STD-1560 insert, P/S. Ordering-code candidate; confirm insert availability with Amphenol.';
  const tvUrl='https://docs.rs-online.com/4793/0900766b814b5158.pdf';
  for(const [pn,h] of Object.entries(data.housings)){
    if(!pn.startsWith('D38999/24W')||!h.cavity_profile||!shells[h.shell_size])continue;
    const arrangement=h.insert_arrangement.replace(/^[A-HJ]/,'');
    const tv={...h,shell_type:undefined,manufacturer:'Amphenol Aerospace',verification:'inferred',ordering_candidate:true,tv:true,mount:'inline',source:tvSource,source_url:tvUrl};
    delete tv.shell_type;delete tv.arrangement_source;
    data.housings[`TV01RW-${shells[h.shell_size]}-${arrangement}S`]={...tv,role:'receptacle',gender:'socket',description:`Amphenol TV line (in-line) receptacle, shell ${shells[h.shell_size]}, insert ${shells[h.shell_size]}-${arrangement}, sockets`};
    data.housings[`TV06RW-${shells[h.shell_size]}-${arrangement}P`]={...tv,role:'plug',gender:'pin',description:`Amphenol TV straight plug, shell ${shells[h.shell_size]}, insert ${shells[h.shell_size]}-${arrangement}, pins`};
  }
  const common={family:'D38999',series:'III',shell_size:'A',insert_arrangement:'A98',keying:'N',termination:'crimp',cavity_profile:{'20':3},manufacturer:'Glenair',finish:'F',contacts_supplied:false,accessory_path:referenceId,reference_path:referenceId,verification_basis:'Manufacturer ordering-code configuration; stock / individual SKU listing not checked.'};
  data.housings[referenceParts.receptacle]={...common,...checked(sources.receptacle,'p. 28, ordering table; arrangement p. 4'),shell_type:'24',role:'receptacle',gender:'socket',mount:'jam-nut',panel_nut:referenceParts.nut};
  data.housings[referenceParts.plug]={...common,...checked(sources.plug,'p. 26, ordering table; arrangement p. 4'),shell_type:'26',role:'plug',gender:'pin',mount:'inline'};
  data.contact_records=[];
  for(const [size,range,pin,socket] of [['22D',[22,28],'M39029/58-360','M39029/56-348'],['20',[20,24],'M39029/58-363','M39029/56-351'],['16',[16,20],'M39029/58-364','M39029/56-352'],['12',[12,14],'M39029/58-365','M39029/56-353']]){
    for(const [gender,pn,url] of [['pin',pin,sources.pins],['socket',socket,sources.sockets]])data.contact_records.push({family:'D38999',series:'III',termination:'crimp',size,gender,pn,awg_range:range,...checked(url,gender==='pin'?'p. 17, standard contacts table':'p. 18, standard contacts table')});
  }
  // This geometry check is a deliberately narrow prototype policy, not a manufacturer cable rating.
  data.accessory_paths={
    [referenceId]:{
      fit_pns:Object.values(referenceParts).slice(0,2),exit:'straight',jacket:'jacketed',shield:false,
      prototype_cable_range_mm:[4,6],
      adapter:{pn:referenceParts.adapter,description:'Straight shrink-boot adapter · size 9 · nickel',...checked(sources.adapter,'p. 31-44, H interface / size 09 / finish M'),thread:'M12 × 1.0',boot_land_max_mm:13.5,cable_entry_min_mm:6.4},
      boot:{pn:referenceParts.boot,description:'Lipped straight boot · Type 1 · W1 adhesive',...checked(sources.boot,'pp. C-6–C-7; size 02, material 1 / W1'),adapter_expanded_min_mm:17,adapter_recovered_max_mm:7,cable_recovered_max_mm:3.5},
      panel_nut:{pn:referenceParts.nut,description:'Size-9 jam nut · nickel · M17 × 1.0',...checked(sources.nut,'p. C-5, dash 1 and finish F')}
    }
  };
  data.reference_tools=[
    {pn:'M22520/2-01',desc:'Crimp tool for size-20 contacts',...checked(sources.tools,'p. 19')},
    {pn:'M22520/2-10',desc:'Size-20 contact positioner',...checked(sources.tools,'p. 19')},
    {pn:'M81969/14-10',desc:'Size-20 insertion / extraction tool',...checked(sources.tools,'p. 21')}
  ];
  data.unused_contact_rules={D38999:{required:true,...checked(sources.installation,'p. 1, section III.3.b')}};
  data.size_sealing_plugs={D38999:{'20':{pn:'MS27488-20-2',...checked(sources.installation,'p. 1, Table 2')}}};
  return data;
}
