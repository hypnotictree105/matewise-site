// HARTING Han E heavy-duty rectangular connectors (first HARTING family; a head start, not complete).
// A Han connection is built from separate parts: a male insert and a female insert (same series and size),
// crimp contacts ordered separately, and on each side a hood or housing of the matching size.
const hartingDs = (pn, url) => ({verification: 'verified', source: `HARTING product data for ${pn}`, source_url: url});
const inserts = [
  // [contacts, size, male PN, male source, female PN, female source]
  [6, '6B', '09330062602', 'https://b2b.harting.com/09330062602', '09330062702', 'https://b2b.harting.com/09330062702'],
  [10, '10B', '09330102602', 'https://www.digikey.com/en/products/detail/harting/09330102602/3180639', '09330102702', 'https://docs.rs-online.com/d70d/A700000014555222.pdf'],
  [16, '16B', '09330162602', 'https://apctech.com/09330162602.html', '09330162702', 'https://apctech.com/09330162702.html'],
  [24, '24B', '09330242602', 'https://docs.rs-online.com/fc9d/A700000014542929.pdf', '09330242702', 'https://kr.element14.com/harting/09-33-024-2702/insert-female-han24e-crimp/dp/3454150']
];
// Han E crimp contacts from the HARTING Han E catalogue pages (section 03). AWG per HARTING's stripping table.
const contactSource = {verification: 'verified', source: 'HARTING Han E/EE catalogue pages, section 03: Han E crimp contacts (silver plated) and stripping table', source_url: 'https://www.farnell.com/datasheets/1807068.pdf'};
const contacts = [
  // [mm², awg range [largest, smallest], male, female, note]
  ['0.14–0.37', [22, 26], '09330006127', '09330006227', 'Use with the BUCHANAN crimp tool 09 99 000 0001 and gauge 09 99 000 0203 (HARTING note).'],
  ['0.5', [20, 20], '09330006121', '09330006220', ''],
  ['0.75', [18, 18], '09330006114', '09330006214', ''],
  ['1.0', [18, 18], '09330006105', '09330006205', ''],
  ['1.5', [16, 16], '09330006104', '09330006204', ''],
  ['2.5', [14, 14], '09330006102', '09330006202', ''],
  ['3.0', [12, 12], '09330006106', '09330006206', ''],
  ['4.0', [12, 12], '09330006107', '09330006207', '']
];

// One deliberately bounded shell arrangement. Covers attach to these shells, never to a bare insert.
const part = (pn, description, reason, url = `https://b2b.harting.com/${pn}`) => ({pn, description, reason, manufacturer: 'HARTING', ...hartingDs(pn, url)});
const panelAssembly = {
  id: 'han6b-panel-m20', label: 'Panel housing + straight cable hood · 6B, single lever, M20',
  scope: 'pair', connection: 'panel', mounts: ['any', 'flange'], exit: 'straight',
  inserts: ['09330062702', '09330062602'], shell_size: '6B', locking: 'single-lever', thread: 'M20x1.5',
  ends: {
    'End A': {
      shell: {...part('09300060301', 'Panel housing · Han 6B, single locking lever', 'Bulkhead housing with NBR seal. Fix with M4 screws (1 Nm); select screw length and panel cutout from the housing drawing. Confirm supplied panel gasket and fasteners.'), shell_size: '6B', locking: 'single-lever'},
      cap: part('09300065405', 'Protective cover · panel housing', '6B thermoplastic cover for bulkhead/surface housings, retained by the housing lever.', 'https://b2b.harting.com/files/livebooks/en/PRD0200000100037/downloads/36.pdf')
    },
    'End B': {
      shell: {...part('19300061440', 'Cable hood · Han 6B, straight top entry, M20', 'Low construction, aluminium hood with two pegs for single-lever locking. Cable gland is a separate purchase.', 'https://b2b.harting.com/ebusiness/es/Han-6-B-Hood-Top-Entry-LC-2-Pegs-M20/19300061440'), shell_size: '6B', locking: 'single-lever', thread: 'M20x1.5'},
      cap: part('09300065423', 'Protective cover · cable hood', '6B hood cover with its own locking lever and fixing cord.', 'https://b2b.harting.com/files/livebooks/en/PRD0200000100037/downloads/35.pdf'),
      gland: {...part('19000005081', 'Cable gland · M20 × 1.5', 'Nickel-plated brass gland with NBR seal. Select the 5–9 mm or 6–12 mm seal arrangement to suit the measured jacket diameter; install to the manufacturer instructions. Thread O-ring is included; no separate O-ring purchase.'), thread: 'M20x1.5', jacket: 'jacketed', seals: {'5-9': [5, 9], '6-12': [6, 12]}, drawing_url: 'https://www.evg.de/media/files_public/710405b3c8deaa70e9ef70de6c6009cb/Harting_KABELVERSCHRAUBUNG_M20x15_5-12mm-19_00_000_5081-102.pdf'}
    }
  }
};

export function extendHarting(data) {
  data.families.HanE = {
    description: 'HARTING Han E · heavy-duty rectangular, 16 A / 500 V, crimp contacts 0.14–4 mm² (AWG 26–12)',
    manufacturer: 'HARTING', match_on: ['family', 'cavities'], verification: 'verified', ...contactSource,
    end_a_role: 'female insert',
    requires_conductor_area: true,
    conductor_areas: contacts.map(([mm2, awg_range]) => ({mm2, awg_range})),
    shell_assemblies: [panelAssembly],
    in_compare: false, // head start: only offered when Han E is chosen explicitly, until hoods and housings are modeled
    unused_cavity_seals: false, // sealing is done by the hood/housing gasket and cable gland, not per cavity
    layouts: {6: [2, 3], 10: [2, 5], 16: [2, 8], 24: [2, 12]},
    shells: {
      panel: {'End A': 'Bulkhead- or surface-mounted housing', 'End B': 'Hood'},
      cables: {'End A': 'Coupler housing', 'End B': 'Hood'},
      existing: {'New mating half': 'Hood or housing'},
      note: 'Han B series, size {size}. Choose cable entry (top or side, thread size), locking (single or double lever) and material. Inserts, hoods and housings are ordered separately. The protective-earth (PE) wire goes to the insert’s screw terminal.'
    }
  };
  data.contact_sizes.HanE = {awg_range: [12, 26], verification: 'verified', label: 'Han E crimp'};
  for (const [n, size, m, mUrl, f, fUrl] of inserts) {
    const common = {family: 'HanE', series: 'E', cavities: n, shell_size: size, mount: 'insert', termination: 'crimp', cavity_profile: {HanE: n}, contacts_supplied: false};
    data.housings[m] = {...common, role: 'male insert', gender: 'pin', ...hartingDs(m, mUrl), description: `Han E ${n}-position male insert, crimp, size ${size}`};
    data.housings[f] = {...common, role: 'female insert', gender: 'socket', ...hartingDs(f, fUrl), description: `Han E ${n}-position female insert, crimp, size ${size}`};
    if (size === '6B') for (const pn of [m, f]) data.housings[pn].protective_earth = {included: true, description: 'Separate PE screw terminal included in the insert; not one of the six crimp positions. PE screw M4: 1.2 Nm. Confirm the PE conductor termination against the insert drawing.', ...hartingDs(pn, `https://b2b.harting.com/${pn}`)};
  }
  for (const [mm2, [lo, hi], male, female, note] of contacts) {
    for (const [gender, pn] of [['pin', male], ['socket', female]]) data.contact_records.push({family: 'HanE', series: 'E', termination: 'crimp', size: 'HanE', gender, pn, awg_range: [lo, hi], wire_mm2: mm2, note, ...contactSource});
  }
}
