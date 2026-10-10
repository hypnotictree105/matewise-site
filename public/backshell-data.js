// Backshells and rear accessories. Each record says what it does (`kind`), its exit angle and which housings it fits.
//  kind: 'basic' (rear cover / wire-bundle backshell), 'strain' (cable clamp / strain relief),
//        'shield' (EMI/RFI shield termination), 'boot-adapter' (heat-shrink boot adapter).
const teDt = {verification: 'verified', source: 'TE DEUTSCH DT Inline Connectors brochure rev 08-25, backshell tables (plug DT06 / receptacle DT04, no cap)', source_url: 'https://www.farnell.com/datasheets/4722649.pdf'};
const as85049 = {verification: 'verified', source: 'd38999-20.com compatible backshells (SAE-AS85049) for Series III shell sizes 9–25; slash numbers cross-checked with Glenair MIL-DTL-38999 backshell selection guide p. H-2/H-3', source_url: 'https://www.d38999-20.com/accessories'};

// TE DT backshells: [positions, plug 180°, plug 90°, receptacle 180°, receptacle 90°, plug tubing sizes in mm, strain-relief versions or null]
const dtRows = [
  [2, '1011-227-0205', '1011-228-0205', '1011-229-0205', '1011-230-0205', '6, 7.5, 8.5 or 10', {plug: ['1011-255-0205', '1011-256-0205'], receptacle: ['1011-257-0205', '1011-258-0205']}],
  [3, '1011-231-0305', '1011-232-0305', '1011-233-0305', '1011-234-0305', null, {plug: ['1011-259-0305', '1011-260-0305'], receptacle: ['1011-261-0305', '1011-262-0305']}],
  [4, '1011-235-0405', '1011-236-0405', '1011-237-0405', '1011-238-0405', null, {plug: ['1011-263-0405', '1011-264-0405'], receptacle: ['1011-265-0405', '1011-266-0405']}],
  [6, '1011-239-0605', '1011-240-0605', '1011-241-0605', '1011-242-0605', '8.5, 10 or 13', {plug: ['1011-267-0605', '1011-268-0605'], receptacle: ['1011-269-0605', '1011-270-0605']}],
  [8, '1011-243-0805', '1011-244-0805', '1011-245-0805', '1011-246-0805', '8.5, 10 or 13', null],
  [12, '1011-247-1205', '1011-248-1205', '1011-249-1205', '1011-250-1205', '10, 13 or 17', null]
];
export function dtBackshells() {
  const out = [];
  for (const [n, p0, p90, r0, r90, tubing, sr] of dtRows) {
    const keyed = n >= 8 ? ' Listed by TE for keys A, B, C and D.' : '';
    const add = (pn, role, angle, kind) => out.push({type: 'backshell', pn, kind, angle, family: 'DT', role, cavities: n, tubing_mm: role === 'plug' && kind === 'basic' ? tubing : null,
      desc: `${angle ? '90°' : 'Straight'} ${kind === 'strain' ? 'strain-relief backshell' : 'backshell'} · DT ${n}-position ${role}`,
      note: (kind === 'strain' ? 'Strain-relief version for jacketed cable.' : (role === 'plug' && tubing ? `For wire bundles in convoluted tubing (TE lists ${tubing} mm tubing).` : 'For wire bundles in convoluted tubing.')) + keyed, ...teDt});
    add(p0, 'plug', 0, 'basic'); add(p90, 'plug', 90, 'basic'); add(r0, 'receptacle', 0, 'basic'); add(r90, 'receptacle', 90, 'basic');
    if (sr) { add(sr.plug[0], 'plug', 0, 'strain'); add(sr.plug[1], 'plug', 90, 'strain'); add(sr.receptacle[0], 'receptacle', 0, 'strain'); add(sr.receptacle[1], 'receptacle', 90, 'strain'); }
  }
  return out;
}
// AS85049 slash sheets used with D38999 Series III. The full part number adds a finish letter and, for some, a
// self-locking 'S' and cable-clamp dash; those are not modeled yet, so lines stay open with the designation shown.
export const d38999Backshells = [
  {slash: '/38', kind: 'strain', angle: 0, desc: 'Straight strain-relief backshell'},
  {slash: '/39', kind: 'strain', angle: 90, desc: '90° strain-relief backshell'},
  {slash: '/88', kind: 'shield', angle: 0, desc: 'Straight EMI/RFI shield-termination backshell, self-locking'},
  {slash: '/89', kind: 'shield', angle: 45, desc: '45° EMI/RFI shield-termination backshell'},
  {slash: '/69', kind: 'boot-adapter', angle: 0, desc: 'Heat-shrink boot adapter'}
].map(b => ({...b, family: 'D38999', ...as85049}));
export const shellNumber = {A: 9, B: 11, C: 13, D: 15, E: 17, F: 19, G: 21, H: 23, J: 25};
