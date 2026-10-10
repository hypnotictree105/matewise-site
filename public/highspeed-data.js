// Coax and USB inside MIL-DTL-38999 Series III style shells (head start).
// Coax lines are matched by cable type to an AS39029 coax contact of a given cavity size.
// USB uses a dedicated rugged USB connector (one port per connector), matched by USB version.
const glenairRf = {verification: 'verified', source: 'Glenair RF, Microwave and Datalink Contacts catalog: AS39029 coaxial contacts (size 8 p. 6, size 12 p. 7), for MIL-DTL-38999 Series I, III and IV', source_url: 'https://www.glenair.com/catalogs/rf-microwave-and-datalink-contacts.pdf'};
export const coaxCables = {
  'RG-316': {label: 'RG-316', families: ['D38999'], max_freq: '3 GHz', contacts: {12: {pin: 'M39029/102-558', socket: 'M39029/103-559', vendor: 'Glenair 852-004-12-558 / 852-005-12-559'}}, ...glenairRf},
  'RG-180': {label: 'RG-180', families: ['D38999'], max_freq: '700 MHz', contacts: {8: {pin: 'M39029/60-367', socket: 'M39029/59-366', vendor: 'Glenair 852-007-08-367 / 852-006-08-366'}}, ...glenairRf}
};
export const dataLinks = {
  'USB 2.0': {cavity: 'USB2', label: 'USB 2.0 (480 Mb/s)'},
  'USB 3.x': {cavity: 'USB3', label: 'USB 3.2 Gen 1 (5 Gb/s)'},
  'Other': {cavity: null, label: 'Ethernet, video or other high-speed'}
};

const amphenolUsb = {verification: 'verified', source: 'Amphenol Socapex / PCD Catalog USB Field: USBFTV (USB 2.0) and USB3FTV (USB 3.2 Gen 1) Type-A, based on MIL-DTL-38999 Series III, shell size 15, tri-start coupling, IP68 mated; shell type 6 plug, 2 square-flange receptacle, 7 jam-nut receptacle', source_url: 'https://www.amphenolpcd.com/wp-content/uploads/2023/06/usb_field_catalog.pdf'};
const glenairInserts = {source: 'Glenair SuperNine High-Speed catalog p. C-6/C-7: Series III layouts 21-75 (4 × #8) and 25-8 (8 × #8)', source_url: 'https://www.glenair.com/supernine/high-speed/pdf/signal-power-and-rf-contacts-plus-insert-arrangements.pdf'};

export function extendHighSpeed(data) {
  data.coax_cables = coaxCables;
  data.data_links = dataLinks;
  data.contact_sizes['8'] = {awg_range: null, verification: 'verified', label: 'Size 8', note: 'Size 8 cavities take coax, twinax or quadrax contacts.'};
  data.contact_sizes.USB2 = {awg_range: null, label: 'USB 2.0 port'};
  data.contact_sizes.USB3 = {awg_range: null, label: 'USB 3.x port'};

  // D38999 Series III layouts with size 8 cavities (MIL part numbers like D38999/26WG75AB and D38999/20WJ8PB exist).
  data.insert_arrangements.G75 = {profile: {8: 4}, verification: 'verified', ...glenairInserts};
  data.insert_arrangements.J8 = {profile: {8: 8}, verification: 'verified', ...glenairInserts};
  const shells = {'20': ['receptacle', 'flange'], '24': ['receptacle', 'jam-nut'], '26': ['plug', 'inline']};
  for (const [arr, size] of [['G75', 'G'], ['J8', 'J']]) for (const [type, [role, mount]] of Object.entries(shells)) for (const gender of ['pin', 'socket']) {
    // Same convention as the existing catalog: receptacles carry sockets, plugs carry pins.
    if ((role === 'receptacle') !== (gender === 'socket')) continue;
    data.housings[`D38999/${type}W${arr}${gender === 'pin' ? 'P' : 'S'}N`] = {family: 'D38999', series: 'III', shell_type: type, shell_size: size, insert_arrangement: arr, keying: 'N', role, gender, mount, termination: 'crimp', cavity_profile: data.insert_arrangements[arr].profile, verification: 'inferred', arrangement_source: glenairInserts.source};
  }

  data.families.USBFTV = {
    description: 'Amphenol Socapex rugged USB (USBFTV / USB3FTV) · MIL-DTL-38999 Series III style shell size 15, IP68 mated',
    manufacturer: 'Amphenol Socapex', match_on: ['family', 'usb'], verification: 'verified', ...amphenolUsb,
    face: 'usb', shown_with: ['D38999'], ordering_note: 'Complete the code from the Amphenol catalog (p. 86 onward): coding A or B, back termination (USB-A female, solder, cordset), plating N nickel, G olive drab cadmium or ZN black zinc nickel, and nut option.'
  };
  const usb = [['USBFTV', 2, 'USB 2.0'], ['USB3FTV', 3, 'USB 3.2 Gen 1']];
  for (const [series, ver, name] of usb) for (const [digit, role, gender, mount, what] of [[2, 'receptacle', 'socket', 'flange', 'square-flange receptacle'], [7, 'receptacle', 'socket', 'jam-nut', 'jam-nut receptacle'], [6, 'plug', 'pin', 'inline', 'plug']]) {
    data.housings[`${series}${digit}`] = {family: 'USBFTV', usb: ver, role, gender, mount, termination: 'usb', cavity_profile: {[`USB${ver}`]: 1}, ordering_incomplete: true, contacts_supplied: true,
      description: `${series} ${what} · ${name} Type-A`, designation: `${series} ${digit}…`, ...amphenolUsb};
  }
}
