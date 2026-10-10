import {data, optionsForPart, chosen, orderPart, dimensionsFor, sizeText} from './engine.js';
import {optionSources, deutschKeys} from './options-data.js';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// Relative contact diameters for the schematic only. Bigger number = bigger contact.
const dot = {'22D': 1, 22: 1, 20: 1.3, 16: 1.75, 12: 2.4, 10: 2.9, 8: 3.4};
const shellSize = {A: 9, B: 11, C: 13, D: 15, E: 17, F: 19, G: 21, H: 23, J: 25};
const unkeyed = '#9ea4a6';

export function lookFor(pn, h, choices) {
  const o = optionsForPart(pn, h);
  const finish = o.find(x => x.id === 'finish'), key = o.find(x => x.id === 'key');
  if (finish) return finish.values[chosen(finish, choices)].look;
  if (key) return key.values[chosen(key, choices)].look;
  return h.family === 'D38999' ? '#c9cdca' : unkeyed;
}
// Places contacts largest-first on concentric rings. Positions are illustrative, not MIL-STD-1560 coordinates.
function ringLayout(profile) {
  const items = Object.entries(profile).flatMap(([size, n]) => Array(n).fill(size)).sort((a, b) => (dot[b] || 1) - (dot[a] || 1));
  const pts = [];
  let i = 0, ring = 0;
  while (i < items.length) {
    const r = dot[items[i]] || 1, pitch = 2 * r + 0.9;
    if (ring === 0) { pts.push({x: 0, y: 0, r, size: items[i++]}); ring = pitch; continue; }
    const cap = Math.max(1, Math.floor(2 * Math.PI * ring / pitch));
    const n = Math.min(cap, items.length - i);
    for (let k = 0; k < n; k++, i++) { const a = -Math.PI / 2 + 2 * Math.PI * k / n; pts.push({x: ring * Math.cos(a), y: ring * Math.sin(a), r: dot[items[i]] || 1, size: items[i]}); }
    ring += pitch;
  }
  const extent = Math.max(...pts.map(p => Math.hypot(p.x, p.y) + p.r), 1);
  return {pts, extent};
}
export function faceDiagram(pn, h, choices, px = 132) {
  if (!h) return '';
  const pin = h.gender === 'pin', fill = lookFor(pn, h, choices);
  const title = `${orderPart(pn, h, choices)} mating face, schematic`;
  const contact = (x, y, r) => pin ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#1f2a2a"/>`
    : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" stroke="#1f2a2a" stroke-width="${Math.max(0.6, r * 0.28).toFixed(1)}"/>`;
  if (data.families[h.family]?.face === 'usb') {
    const R = 50;
    return `<svg class="face" viewBox="${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}" width="${px}" height="${px}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>
<circle r="${R}" fill="${fill}" stroke="#1f2a2a" stroke-width="2"/><circle r="${R * 0.82}" fill="#eef1ec" stroke="#1f2a2a" stroke-opacity=".35"/><rect x="-4" y="${-R - 4}" width="8" height="${R * 0.2 + 4}" rx="2" fill="#1f2a2a"/>
<rect x="-24" y="-9" width="48" height="18" rx="2" fill="${pin ? '#1f2a2a' : '#fff'}" stroke="#1f2a2a" stroke-width="2"/><rect x="-18" y="${pin ? -3 : -6}" width="36" height="6" fill="${pin ? '#c9cdca' : '#1f2a2a'}"/></svg>`;
  }
  if (h.family === 'D38999') {
    const shell = shellSize[h.shell_size] || 17, R = 26 + shell * 1.5, {pts, extent} = ringLayout(h.cavity_profile || {});
    const k = (R * 0.74) / extent;
    return `<svg class="face" viewBox="${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}" width="${px}" height="${px}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>
<circle r="${R}" fill="${fill}" stroke="#1f2a2a" stroke-width="2"/><circle r="${R * 0.86}" fill="#eef1ec" stroke="#1f2a2a" stroke-opacity=".35"/>
<rect x="-4" y="${-R - 4}" width="8" height="${R * 0.2 + 4}" rx="2" fill="#1f2a2a"/>
${pts.map(p => contact(p.x * k, p.y * k, Math.max(1.6, p.r * k))).join('')}</svg>`;
  }
  const [rows, cols] = data.families[h.family]?.layouts?.[h.cavities] || data.deutsch_layouts?.[h.cavities] || [1, h.cavities || 1];
  const cr = h.family === 'DTP' ? 8 : h.family === 'DTM' ? 5 : 6.5;
  const dims = dimensionsFor(pn, h).overall;
  // With TE reference dimensions the outline uses the true width : height ratio (height includes the latch).
  let w = cols * 22 + 18, hh = rows * 22 + 18;
  if (dims) { const scale = 100 / dims.mm.width; w = 100; hh = Math.max(rows * 20 + 10, dims.mm.height * scale - 12); }
  const px0 = (w - 10) / cols, py0 = (hh - 10) / rows, pitch = Math.min(px0, py0, 24), r0 = Math.min(cr, pitch * 0.32);
  const ox = (w - cols * pitch) / 2, oy = (hh - rows * pitch) / 2;
  let cells = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells += contact(ox + pitch / 2 + c * pitch, oy + pitch / 2 + r * pitch, r0);
  const dimW = dims ? 22 : 0, dimH = dims ? 30 : 0;
  const label = (x, y, t, rot) => `<text x="${x}" y="${y}" font-size="9" fill="#46534d" text-anchor="middle" font-family="DM Sans, sans-serif"${rot ? ` transform="rotate(-90 ${x} ${y})"` : ''}>${t}</text>`;
  const dimLines = dims ? `<g stroke="#46534d" stroke-width=".8"><line x1="0" y1="${hh + 9}" x2="${w}" y2="${hh + 9}"/><line x1="0" y1="${hh + 5}" x2="0" y2="${hh + 13}"/><line x1="${w}" y1="${hh + 5}" x2="${w}" y2="${hh + 13}"/><line x1="${w + 9}" y1="-12" x2="${w + 9}" y2="${hh}"/><line x1="${w + 5}" y1="-12" x2="${w + 13}" y2="-12"/><line x1="${w + 5}" y1="${hh}" x2="${w + 13}" y2="${hh}"/></g>${label(w / 2, hh + 20, dims.mm.width + ' mm')}${label(w + 19, (hh - 12) / 2, dims.mm.height + ' mm', true)}` : '';
  const vw = w + 8 + dimH, vh = hh + 18 + dimW;
  return `<svg class="face" viewBox="-4 -14 ${vw} ${vh}" width="${px}" height="${Math.round(px * vh / vw)}" role="img" aria-label="${esc(title)}${dims ? ', ' + dims.mm.width + ' by ' + dims.mm.height + ' mm overall' : ''}"><title>${esc(title)}</title>
${data.families[h.family]?.shells ? `<circle cx="-0.5" cy="${hh / 2}" r="3.2" fill="#fff" stroke="#1f2a2a" stroke-width="1.2"/><circle cx="${w + 0.5}" cy="${hh / 2}" r="3.2" fill="#fff" stroke="#1f2a2a" stroke-width="1.2"/>` : `<rect x="${w / 2 - 14}" y="-12" width="28" height="12" rx="3" fill="${fill}" stroke="#1f2a2a" stroke-width="1.5"/>`}
<rect x="0" y="0" width="${w}" height="${hh}" rx="9" fill="${fill}" stroke="#1f2a2a" stroke-width="2"/>
<rect x="5" y="5" width="${w - 10}" height="${hh - 10}" rx="6" fill="#eef1ec" stroke="#1f2a2a" stroke-opacity=".3"/>${cells}${dimLines}</svg>`;
}
function picker(o, choices) {
  const current = chosen(o, choices);
  const swatch = (code, v) => v.look ? `<span class="swatch" style="background:${v.look}" aria-hidden="true"></span>` : `<span class="swatch letter" aria-hidden="true">${esc(code)}</span>`;
  const cards = Object.entries(o.values).map(([code, v]) => `<label class="option-tile ${code === current ? 'on' : ''}"><input type="radio" name="options.${o.id}" value="${esc(code)}" ${code === current ? 'checked' : ''}>${swatch(code, v)}<span><strong>${esc(code)} · ${esc(v.label || v.finish)}</strong><small>${esc(v.material ? v.material + (v.rating ? ' · ' + v.rating : '') : v.note || '')}</small></span></label>`).join('');
  return `<fieldset class="option-group"><legend>${esc(o.label)}</legend><p class="option-help">${esc(o.help)}</p><div class="option-tiles ${o.id}">${cards}</div><p class="option-source">Source: <a href="${esc(o.source_url)}" target="_blank" rel="noopener noreferrer">${esc(o.source)}</a></p></fieldset>`;
}
function mix(h) {
  return Object.entries(h.cavity_profile || {}).map(([size, n]) => `${n} × ${data.contact_sizes?.[size]?.label || 'size ' + size}`).join(' · ');
}
function sizes(e) {
  const d = dimensionsFor(e.pn, e.h), rows = [];
  if (d.overall) rows.push(`Overall ${sizeText(d)} <span class="muted">(${d.overall.inches.length.toFixed(3)} × ${d.overall.inches.width.toFixed(3)} × ${d.overall.inches.height.toFixed(3)} in${d.overall.verification === 'verified' ? '' : '; confirm on the TE drawing'})</span>`);
  if (d.insulation) rows.push(`Wire insulation ${d.insulation.min}–${d.insulation.max} mm${d.insulation.alt ? ` <span class="muted">(${esc(d.insulation.alt.name)} ${d.insulation.alt.min}–${d.insulation.alt.max} mm)</span>` : ''}`);
  for (const r of d.reference || []) rows.push(`${esc(r.label)}: ${esc(r.value)}`);
  return rows.length ? `<ul class="size-list">${rows.map(r => `<li>${r}</li>`).join('')}</ul>` : '';
}
function sizeSource(ends) {
  const d = dimensionsFor(ends[0].pn, ends[0].h), src = d.overall || d.insulation || (d.reference && {source: 'Glenair drawings for the reference adapter, boot and nut', source_url: d.reference[0].source});
  return src ? `<p class="option-source">Sizes are reference values, not a fit approval. Source: <a href="${esc(src.source_url)}" target="_blank" rel="noopener noreferrer">${esc(src.source)}</a>${d.overall && d.insulation && d.insulation.source_url !== d.overall.source_url ? `; <a href="${esc(d.insulation.source_url)}" target="_blank" rel="noopener noreferrer">${esc(d.insulation.source)}</a>` : ''}</p>` : '';
}
export function optionsPanel(ends, choices) {
  if (!ends?.length) return '';
  const first = ends[0], opts = optionsForPart(first.pn, first.h);
  const faces = ends.map(e => `<figure>${faceDiagram(e.pn, e.h, choices, 150)}<figcaption><strong>${esc(e.label)}</strong><span>${esc(e.h.ordering_incomplete ? e.h.designation + ' · code to complete' : orderPart(e.pn, e.h, choices))}</span><small>${esc(e.h.description || ((e.h.gender === 'pin' ? 'Pins' : 'Sockets') + ' · ' + mix(e.h)))}</small>${sizes(e)}</figcaption></figure>`).join('');
  const d38 = first.h.family === 'D38999';
  const links = d38 ? `<a href="${optionSources.d38999Inserts.source_url}" target="_blank" rel="noopener noreferrer">Exact ${esc(first.h.insert_arrangement)} layout on the MIL-STD-1560 chart ↗</a><a href="${optionSources.d38999KeyingChart.source_url}" target="_blank" rel="noopener noreferrer">Keying positions chart ↗</a>`
    : opts.length ? `<a href="${optionSources.dtKeys.drawing_url}" target="_blank" rel="noopener noreferrer">TE 12-way drawing ↗</a>` : '';
  const why = first.h.reference_path ? '<p class="option-help">This source-checked reference keeps its fixed finish and keying so the adapter and boot stay matched.</p>'
    : first.h.ordering_candidate ? '<p class="option-help">Glenair ordering-code candidate: finish and keying are set in the Glenair code. Ask Glenair for other options.</p>'
    : !opts.length ? `<p class="option-help">${(first.h.family === 'DT' || first.h.family === 'DTM') && [8, 12].includes(first.h.cavities) ? 'This catalog record has its key fixed in the part number. 8- and 12-position DEUTSCH housings come in keys A (gray), B (black), C (green) and D (brown); plug and receptacle must use the same key.' : first.h.family === 'DT' || first.h.family === 'DTM' ? 'Keyed colors are offered on 8- and 12-position housings. This size uses the standard housing.' : 'No finish or keying options are recorded for this part yet.'}</p>` : '';
  return `<section class="option-guide"><span class="eyebrow">YOUR CONNECTOR, FACE ON · SIZES</span><div class="faces">${faces}</div>
<p class="option-note">${data.families[first.h.family]?.face === 'usb' ? 'Schematic face view of the USB connector.' : ''}${data.families[first.h.family]?.face === 'usb' ? '</p><p hidden>' : ''}Schematic: shows how many contacts of each size${d38 ? '' : ' and how the cavities are arranged in rows'}. It is not the exact contact positions, spacing or cavity numbering.${d38 ? '' : ' Cavity numbers are marked on the part itself.'} Pins are filled, sockets are open.</p>
<div class="option-links">${links}</div>${sizeSource(ends)}${why}${opts.map(o => picker(o, choices)).join('')}</section>`;
}
export {deutschKeys};
