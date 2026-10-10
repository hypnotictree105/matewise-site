// Reference dimensions. Inches as printed by the source, with mm. Used for size captions and drawings, not for fit approval.
export const dtDims = {
  verification: 'verified',
  source: 'TE DEUTSCH DT Inline Connectors brochure rev 08-25, "DT Series Dimensions" (reference only)',
  source_url: 'https://www.farnell.com/datasheets/4722649.pdf',
  // cavities: plug (DT06) A length, B height, C width | receptacle (DT04) D length, E height, F width, inches
  rows: {
    2: {plug: [1.118, 0.628, 0.591], receptacle: [1.708, 0.670, 0.675]},
    3: {plug: [1.118, 0.934, 0.718], receptacle: [1.698, 0.973, 0.832]},
    4: {plug: [1.218, 0.724, 0.716], receptacle: [1.808, 0.776, 0.820]},
    6: {plug: [1.218, 0.891, 0.716], receptacle: [1.808, 0.951, 0.820]},
    // The 8- and 12-position rows run together in the source text; values matched by column order. Check the drawing.
    8: {plug: [1.217, 0.776, 1.465], receptacle: [1.798, 1.000, 1.435], verification: 'inferred'},
    12: {plug: [1.218, 0.716, 1.597], receptacle: [1.808, 0.876, 1.597], verification: 'inferred'}
  }
};
// Wire insulation outside diameter the rear seal is made for (mm).
export const insulationOD = {
  DT: {min: 2.23, max: 3.68, alt: {name: 'E-seal versions', min: 1.35, max: 3.05}, inches: '.088–.145 in', verification: 'verified',
    source: 'TE DEUTSCH DT Inline Connectors brochure rev 08-25: N seal .088–.145 in, E seal .053–.120 in', source_url: 'https://www.farnell.com/datasheets/4722649.pdf'},
  DTP: {min: 3.40, max: 4.32, inches: '.134–.170 in', verification: 'verified',
    source: 'TE drawing DTP04-4P-L012 (0425-015-0000 rev E1): insulation O.D. .134–.170 in', source_url: 'https://www.farnell.com/cad/2326992.pdf'}
};
