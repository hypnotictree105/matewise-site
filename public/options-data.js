// Ordering options people often have a preference for: D38999 finish and keying, and DEUTSCH key colors.
// Every value below is transcribed from the linked source. Swatch colors are an approximate on-screen look,
// for illustration only.
export const FEDERAL = 'https://d38999.federalconnectors.com/';
export const optionSources = {
  d38999Finish: {verification: 'verified', source: 'd38999.federalconnectors.com, Part Number Breakdown: Material and Finish (retrieved 2026-10-09)', source_url: FEDERAL + '#part-number-breakdown'},
  d38999Keying: {verification: 'verified', source: 'd38999.federalconnectors.com, Part Number Breakdown: Keying Position (retrieved 2026-10-09)', source_url: FEDERAL + '#keying-position'},
  d38999Inserts: {source: 'MIL-STD-1560 insert arrangement chart on d38999.federalconnectors.com', source_url: FEDERAL + 'images/Insert-Arrangements.jpg'},
  d38999KeyingChart: {source_url: FEDERAL + 'images/D38999-Keying-Positions.jpg'},
  tvClass: {verification: 'verified', source: 'Amphenol Aerospace Tri-Start (TV) catalog, p. 43: service class codes RW, RF, RK, RS, DN', source_url: 'https://docs.rs-online.com/4793/0900766b814b5158.pdf'},
  dtKeys: {verification: 'verified', source: 'TE DEUTSCH DT Inline Connectors brochure (rev 08-25): "4 keys available for 8 & 12 position", A GRY, B BLK, C GRN, D BRN; TE drawing DT06-12SX-E003 rev A1 note 4: mates with DT04-12P* (same key)', source_url: 'https://www.farnell.com/datasheets/4722649.pdf', drawing_url: 'https://www.mouser.com/datasheet/2/418/8/ENG_CD_DT06_12SX_E003_A1-605785.pdf'},
  dtmKeys: {verification: 'verified', source: 'TE application specification 114-151010 rev D2 (DTM): 8- and 12-pin housings color-coded to the keying letter; plug and receptacle must be the same key', source_url: 'https://www.farnell.com/datasheets/4800282.pdf'}
};

const looks = {nickel: '#c9cdca', od: '#5d6140', stainless: '#b7bbbd', firewall: '#a3a8aa', ptfe: '#55595c', black: '#2b2e2f', space: '#d6d9d6'};
// Material and Finish codes exactly as listed by d38999.federalconnectors.com. `shells` says which shell types use it.
export const d38999Finishes = {
  F: {material: 'Aluminum', finish: 'Electroless nickel', rating: '48-hr salt spray', look: looks.nickel, shells: 'standard'},
  G: {material: 'Aluminum', finish: 'Space-grade electroless nickel', rating: '48-hr salt spray', look: looks.space, shells: 'standard'},
  J: {material: 'Composite', finish: 'Olive drab cadmium', rating: '2000-hr salt spray', look: looks.od, shells: 'standard'},
  K: {material: 'Stainless steel', finish: 'Corrosion-resistant stainless, firewall', rating: '500-hr salt spray', look: looks.firewall, shells: 'standard'},
  L: {material: 'Stainless steel', finish: 'Electrodeposited nickel', rating: '48-hr salt spray', look: looks.nickel, shells: 'standard'},
  M: {material: 'Composite', finish: 'Electroless nickel', rating: '2000-hr salt spray', look: looks.nickel, shells: 'standard'},
  S: {material: 'Stainless steel', finish: 'Nickel plated', rating: '500-hr salt spray', look: looks.nickel, shells: 'standard'},
  T: {material: 'Aluminum', finish: 'Nickel PTFE', rating: '500-hr salt spray', look: looks.ptfe, shells: 'standard'},
  W: {material: 'Aluminum', finish: 'Olive drab cadmium', rating: '500-hr salt spray', look: looks.od, shells: 'standard'},
  Z: {material: 'Aluminum', finish: 'Black zinc nickel', rating: '500-hr salt spray', look: looks.black, shells: 'standard'},
  H: {material: 'Hermetic', finish: 'Space grade', rating: '', look: looks.space, shells: 'hermetic'},
  N: {material: 'Hermetic', finish: 'Stainless steel, nickel plated', rating: '', look: looks.nickel, shells: 'hermetic'},
  Y: {material: 'Hermetic', finish: 'Stainless steel, passivated', rating: '', look: looks.stainless, shells: 'hermetic'}
};
export const tvClasses = {
  RW: {material: 'Aluminum', finish: 'Olive drab cadmium', rating: '500-hr salt spray · 175 °C', look: looks.od},
  RF: {material: 'Aluminum', finish: 'Electroless nickel', rating: '48-hr salt spray · 200 °C', look: looks.nickel},
  RK: {material: 'Stainless steel', finish: 'Corrosion-resistant, firewall', rating: '500-hr salt spray · 200 °C', look: looks.firewall},
  RS: {material: 'Stainless steel', finish: 'Nickel plated, firewall barrier', rating: '500-hr salt spray · 200 °C', look: looks.nickel},
  DN: {material: 'Aluminum', finish: 'Durmalon (nickel-PTFE)', rating: '1000-hr salt spray · 175 °C', look: looks.ptfe}
};
export const d38999Keying = {
  N: {label: 'Normal', note: 'Standard position. Most common choice.'},
  A: {label: 'Alternate A', note: 'Rotated keyways.'},
  B: {label: 'Alternate B', note: 'Rotated keyways.'},
  C: {label: 'Alternate C', note: 'Rotated keyways.'},
  D: {label: 'Alternate D', note: 'Rotated keyways.'},
  E: {label: 'Alternate E', note: 'Rotated keyways.'}
};
export const deutschKeys = {
  A: {label: 'Gray', look: '#8f9497'},
  B: {label: 'Black', look: '#262829'},
  C: {label: 'Green', look: '#3e7a4a'},
  D: {label: 'Brown', look: '#6d4b33'}
};

// Families declare their options here; the engine applies them generically.
//  kind 'replace': `regex` must match the base part number; group `group` is swapped for the chosen code.
//  kind 'suffix':  the chosen code is appended to a base part number matching `regex` (housings with `cavities` in `cavities`).
export function extendOptions(data) {
  const shellKind = h => data.shell_types?.[h.shell_type]?.hermetic ? 'hermetic' : 'standard';
  const finishValues = h => Object.fromEntries(Object.entries(d38999Finishes).filter(([, f]) => f.shells === shellKind(h)));
  const milPattern = '^(D38999/\\d\\d)([A-Z])([A-J]\\d+[PSABHJ])([NA-E])$';
  data.families.D38999.options = [
    {id: 'finish', label: 'Material & finish', kind: 'replace', regex: milPattern, group: 2, values: finishValues, ...optionSources.d38999Finish,
      help: 'Changes the material and plating letter in the part number. Confirm the finish is offered for this shell type.'},
    {id: 'keying', label: 'Keying position', kind: 'replace', regex: milPattern, group: 4, values: () => d38999Keying, both: true, ...optionSources.d38999Keying,
      help: 'Both halves get the same letter. Use different letters on side-by-side connectors of the same size so they can’t be swapped.'}
  ];
  // Amphenol TV service class (material and finish) codes, from the Tri-Start catalog p. 43. RK and RS are not offered with coax.
  const tvClass = h => Object.fromEntries(Object.entries(tvClasses).filter(([k]) => !(h.cavity_profile?.['8'] && (k === 'RK' || k === 'RS'))));
  data.families.D38999.options.push({id: 'finish', label: 'Service class (material & finish)', kind: 'replace', regex: '^(TV0[16])(RW|RF|RK|RS|DN)(-\\d+-\\d+[PS])$', group: 2, values: tvClass, ...optionSources.tvClass,
    help: 'Amphenol TV parts carry a two-letter service class instead of the MIL finish letter. Normal keying; ask Amphenol for alternate key positions.'});
  const keyOption = (src, help) => ({id: 'key', label: 'Key & housing color', kind: 'suffix', cavities: [8, 12], regex: '^DTM?0[46]-(?:08|12)[PS]$', values: () => deutschKeys, default: 'A', both: true, ...src, help});
  data.families.DT.options = [keyOption(optionSources.dtKeys, 'DT 8- and 12-position housings come in four keys, each molded in its own color. Plug and receptacle must use the same key. Use different keys on neighboring harnesses so they can’t be cross-connected.')];
  data.families.DTM.options = [keyOption(optionSources.dtmKeys, 'DTM 8- and 12-pin housings are color-coded to the key letter. Plug and receptacle must use the same key.')];

  // DT 8-position part numbers use a two-digit size: DT04-08PA / DT06-08SA (TE brochure rev 08-25).
  for (const [old, pn] of [['DT04-8P', 'DT04-08P'], ['DT06-8S', 'DT06-08S']]) {
    if (data.housings[old] && !data.housings[pn]) { data.housings[pn] = {...data.housings[old], pn_note: 'Part number corrected to TE format ' + pn + '*'}; delete data.housings[old]; }
  }

  // Cavity arrangement for the face diagram: rows × columns. Counts are catalog facts; DEUTSCH row layout is drawn
  // schematically (cavity numbers are molded on the housing; see the product drawing).
  // 6-position is drawn 3 rows × 2: TE lists it taller (.891 in) than wide (.716 in), the same width as the 2 × 2 4-position.
  data.deutsch_layouts = {2: [1, 2], 4: [2, 2], 6: [3, 2], 8: [2, 4], 12: [2, 6]};
}
