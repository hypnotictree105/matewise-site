import {backshellsFor, pickBackshell, orderPart, dimensionsFor} from './engine.js';
import {lookFor} from './option-guide.js';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const INK = '#222527', PLASTIC = '#4b5054', BOOT = '#2c3032', JACKET = '#6f757a', BRAID = '#9a9fa2';
const kindName = {basic: 'Backshell', strain: 'Strain relief', shield: 'Shield termination', 'boot-adapter': 'Boot adapter'};
const angleName = a => a ? a + '° exit' : 'Straight exit';

// Side view of one cable end: mating face on the left, cable leaving to the right (or bending down).
// Schematic only: proportions are illustrative, not dimensions.
export function cableEndDrawing(h, b, opts = {}) {
  const {px = 300, color = '#c9cbcd', boot = false, length = null} = opts;
  const kind = b?.kind || 'none', angle = b?.angle || 0, cy = 60;
  const d38 = h?.family === 'D38999';
  let body;
  if (d38) {
    const knurl = Array.from({length: 7}, (_, i) => `<line x1="${16 + i * 6}" y1="32" x2="${16 + i * 6}" y2="88" stroke="${INK}" stroke-opacity=".35"/>`).join('');
    body = `<rect x="10" y="30" width="50" height="60" rx="5" fill="${color}" stroke="${INK}" stroke-width="2"/>${knurl}<rect x="60" y="38" width="36" height="44" rx="3" fill="${color}" stroke="${INK}" stroke-width="2"/><rect x="96" y="44" width="10" height="32" fill="${color}" stroke="${INK}" stroke-width="1.5"/>`;
  } else {
    body = `<rect x="30" y="24" width="34" height="13" rx="3" fill="${color}" stroke="${INK}" stroke-width="1.5"/><rect x="10" y="34" width="86" height="52" rx="8" fill="${color}" stroke="${INK}" stroke-width="2"/><rect x="96" y="42" width="10" height="36" rx="2" fill="${color}" stroke="${INK}" stroke-width="1.5"/>`;
  }
  const metal = d38 ? color : PLASTIC;
  const cable = (x, len, r = 8, braid = false) => `<rect x="${x}" y="${cy - r}" width="${len}" height="${2 * r}" rx="${r}" fill="${JACKET}" stroke="${INK}" stroke-width="1.5"/>${braid ? `<rect x="${x}" y="${cy - r - 2}" width="22" height="${2 * r + 4}" fill="url(#braid)" stroke="${INK}" stroke-width="1"/>` : ''}`;
  const tube = (x, len) => `<path d="M${x} ${cy - 13} ${Array.from({length: Math.floor(len / 8)}, (_, i) => `q4 -4 8 0`).join(' ')} V${cy + 13} ${Array.from({length: Math.floor(len / 8)}, () => `q-4 4 -8 0`).join(' ')} Z" fill="${PLASTIC}" stroke="${INK}" stroke-width="1.2"/>`;
  // Rear section drawn as if straight, starting at x=0; rotated into place for angled exits.
  let rear = '';
  if (kind === 'none') rear = cable(0, 150, 9);
  else if (kind === 'basic') rear = `<path d="M0 ${cy - 28} H34 L56 ${cy - 15} V${cy + 15} L34 ${cy + 28} H0 Z" fill="${metal}" stroke="${INK}" stroke-width="2"/>${tube(56, 120)}`;
  else if (kind === 'strain') rear = `<path d="M0 ${cy - 26} H40 L58 ${cy - 18} V${cy + 18} L40 ${cy + 26} H0 Z" fill="${metal}" stroke="${INK}" stroke-width="2"/><rect x="58" y="${cy - 30}" width="9" height="60" rx="2" fill="${metal}" stroke="${INK}" stroke-width="1.5"/><rect x="69" y="${cy - 30}" width="9" height="60" rx="2" fill="${metal}" stroke="${INK}" stroke-width="1.5"/><circle cx="73" cy="${cy - 23}" r="3.5" fill="${INK}"/><circle cx="73" cy="${cy + 23}" r="3.5" fill="${INK}"/>${cable(78, 110)}`;
  else if (kind === 'shield') rear = `<path d="M0 ${cy - 26} H46 L66 ${cy - 16} V${cy + 16} L46 ${cy + 26} H0 Z" fill="${metal}" stroke="${INK}" stroke-width="2"/><rect x="48" y="${cy - 21}" width="7" height="42" fill="${INK}"/>${cable(66, 120, 9, true)}`;
  else if (kind === 'boot-adapter') rear = `<rect x="0" y="${cy - 24}" width="34" height="48" rx="3" fill="${metal}" stroke="${INK}" stroke-width="2"/><rect x="22" y="${cy - 24}" width="5" height="48" fill="${INK}" fill-opacity=".45"/>${boot ? `<path d="M26 ${cy - 28} H70 C96 ${cy - 26} 104 ${cy - 11} 128 ${cy - 11} V${cy + 11} C104 ${cy + 11} 96 ${cy + 26} 70 ${cy + 28} H26 Z" fill="${BOOT}" stroke="${INK}" stroke-width="1.5"/>` : ''}${cable(boot ? 126 : 34, boot ? 70 : 150)}`;
  const pivot = 106;
  const rearGroup = angle ? `<g transform="translate(${pivot} 0) rotate(${angle} 0 ${cy})">${rear}</g><circle cx="${pivot}" cy="${cy}" r="${kind === 'none' ? 9 : 26}" fill="${kind === 'none' ? JACKET : metal}" stroke="${INK}" stroke-width="2"/>` : `<g transform="translate(${pivot} 0)">${rear}</g>`;
  const h0 = angle === 90 ? 260 : angle === 45 ? 210 : length ? 124 : 120, w = angle === 90 ? 150 : 320;
  const title = `${b ? kindName[kind] + ', ' + angleName(angle).toLowerCase() : 'Connector with bare cable'}: schematic side view`;
  return `<svg class="cable-end" viewBox="0 0 ${w} ${h0}" width="${Math.round(px * w / 320)}" height="${Math.round(px * h0 / 320)}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>
<defs><pattern id="braid" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="${BRAID}"/><line x1="0" y1="0" x2="0" y2="5" stroke="${INK}" stroke-width="1.2"/></pattern></defs>
${rearGroup}${body}${length ? `<g stroke="#474d52" stroke-width=".8"><line x1="10" y1="104" x2="106" y2="104"/><line x1="10" y1="99" x2="10" y2="109"/><line x1="106" y1="99" x2="106" y2="109"/></g><text x="58" y="117" font-size="10" fill="#474d52" text-anchor="middle" font-family="Arial, sans-serif">housing ${length} mm</text>` : ''}</svg>`;
}

// "What fits this connector": every recorded rear accessory as a small drawing, the current pick highlighted.
export function backshellPanel(ends, s) {
  const a = s.accessories, first = ends?.[0];
  if (!first) return '';
  const list = backshellsFor(first.pn, first.h);
  const color = lookFor(first.pn, first.h, s.options);
  const wanted = a.protection || a.boot || a.shield;
  const {pick} = pickBackshell(list, a);
  const current = wanted ? pick : null;
  const hero = `<figure class="cable-hero">${cableEndDrawing(first.h, current, {px: 300, color, boot: a.boot, length: dimensionsFor(first.pn, first.h).overall?.mm.length})}<figcaption><strong>${esc(first.label)} · ${esc(orderPart(first.pn, first.h, s.options))}</strong><span>${current ? esc(kindName[current.kind] + ' · ' + angleName(current.angle) + ' · ' + (current.pn || current.designation)) : wanted ? 'Rear accessory still to be chosen. Pick a cable exit below.' : 'No rear accessory selected.'}</span></figcaption></figure>`;
  if (!list.length) return `<section class="backshell-guide"><span class="eyebrow">YOUR CABLE END, SIDE VIEW</span>${hero}<p class="option-note">${first.h.reference_path ? 'The source-checked reference uses its own adapter and boot, listed below.' : 'No backshells are recorded for this connector yet. The parts list keeps the backshell as an open item.'}</p></section>`;
  const byRole = ends.length > 1 ? ' Each half has its own part number; the drawing shows ' + esc(first.label) + '.' : '';
  const cards = list.map(b => {
    const on = current && (b.pn ? b.pn === current.pn : b.designation === current.designation);
    return `<div class="bs-card ${on ? 'on' : ''}">${cableEndDrawing(first.h, b, {px: 150, color, boot: b.kind === 'boot-adapter'})}<strong>${esc(kindName[b.kind])} · ${esc(angleName(b.angle))}</strong><span class="bs-pn">${esc(b.pn || b.designation + '*')}</span><small>${esc(b.note || b.desc)}</small>${b.tubing_mm ? `<small><strong>Tubing:</strong> ${esc(b.tubing_mm)} mm</small>` : ''}${on ? '<em>In your parts list</em>' : ''}</div>`;
  }).join('');
  const src = list[0];
  return `<section class="backshell-guide"><span class="eyebrow">YOUR CABLE END, SIDE VIEW</span>${hero}
<p class="option-note">Schematic, not to scale.${byRole} Your choices below (protect, boot or shield, plus cable exit and jacket) decide which one goes in the parts list.</p>
<details class="visual-help" ${wanted ? '' : 'open'}><summary>What fits this connector (${list.length})</summary><div class="bs-grid">${cards}</div>
${list.some(b => b.designation) ? '<p class="option-note">* AS85049 designation for this shell size. The orderable number also needs a finish letter and, on some slash sheets, self-locking and cable-clamp options.</p>' : ''}
<p class="option-source">Source: <a href="${esc(src.source_url)}" target="_blank" rel="noopener noreferrer">${esc(src.source)}</a></p></details></section>`;
}
