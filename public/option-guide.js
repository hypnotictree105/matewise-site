import {data, optionsForPart, chosen, orderPart, dimensionsFor, sizeText} from './engine.js';
import {optionSources, deutschKeys} from './options-data.js';
import {insertLayouts, insertOutline, insertSource} from './insert-layouts.js';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// Relative contact diameters for the schematic only. Bigger number = bigger contact.
const dot = {'22D': 1, 22: 1, 20: 1.3, 16: 1.75, 12: 2.4, 10: 2.9, 8: 3.4};
const shellSize = {A: 9, B: 11, C: 13, D: 15, E: 17, F: 19, G: 21, H: 23, J: 25};
const unkeyed = '#9ea3a6';

export function lookFor(pn, h, choices) {
  const o = optionsForPart(pn, h);
  const finish = o.find(x => x.id === 'finish'), key = o.find(x => x.id === 'key');
  if (finish) return finish.values[chosen(finish, choices)].look;
  if (key) return key.values[chosen(key, choices)].look;
  return h.family === 'D38999' ? '#c9cbcd' : unkeyed;
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
// MIL-STD-1560 cavity diameter (socket insert) and pin engaging-end diameter, inches, by contact size (paragraph 5.1c).
const cavityDia = {'22D': .035, 22: .036, 20: .049, 16: .071, 12: .103, 10: .134, 8: .227};
const pinDia = {'22D': .030, 22: .030, 20: .040, 16: .0625, 12: .094, 10: .125, 8: .218};
// True-position face from the MIL-STD-1560 contact tables, drawn at scale (1 unit = 0.01 in).
// Pin inserts are drawn as tabulated; socket inserts are the mirror image, as seen looking at their own mating face.
function d38999Face(pn, h, choices, px, {labels = px >= 200} = {}) {
  const lay = insertLayouts[h.insert_arrangement], pin = h.gender === 'pin', fill = lookFor(pn, h, choices);
  const r0 = insertOutline[lay.shell] * 100, R = r0 * 1.1 + 2.5, pad = 3;
  const pts = lay.contacts.map(([id, x, y, size]) => ({id, x: (pin ? x : -x) * 100, y: -y * 100, size}));
  let gap = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) gap = Math.min(gap, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  if (!Number.isFinite(gap)) gap = 20;
  const font = Math.min(5.5, Math.max(1.8, gap * 0.36)), dark = '#222527';
  const dots = pts.map(p => {
    const rc = (cavityDia[p.size] || .05) * 50, rp = (pinDia[p.size] || .04) * 50;
    const mark = pin ? `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${rc.toFixed(2)}" fill="#fff" stroke="${dark}" stroke-width=".35"/><circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${rp.toFixed(2)}" fill="${dark}"/>`
      : `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${rc.toFixed(2)}" fill="#fff" stroke="${dark}" stroke-width="${Math.max(.35, rc * .22).toFixed(2)}"/>`;
    const big = p.size === '8' || p.size === '12';
    const label = !labels ? '' : big ? `<text x="${p.x.toFixed(2)}" y="${(p.y + font * .36).toFixed(2)}" font-size="${(font * 1.3).toFixed(2)}" text-anchor="middle" fill="${pin ? '#fff' : dark}" font-weight="700">${esc(p.id)}</text>`
      : `<text x="${(p.x + rc * .75 + font * .1).toFixed(2)}" y="${(p.y - rc * .75).toFixed(2)}" font-size="${font.toFixed(2)}" fill="#3b4144">${esc(p.id)}</text>`;
    return mark + label;
  }).join('');
  const title = `${orderPart(pn, h, choices)} ${pin ? 'pin' : 'socket'} insert, mating face, MIL-STD-1560 arrangement ${lay.shell}-${h.insert_arrangement.slice(1)}`;
  const v = R + pad;
  return `<svg class="face face-1560" viewBox="${-v} ${-v} ${2 * v} ${2 * v}" width="${px}" height="${px}" role="img" aria-label="${esc(title)}" font-family="Arial, sans-serif"><title>${esc(title)}</title>
<circle r="${R}" fill="${fill}" stroke="${dark}" stroke-width="1.2"/><circle r="${r0}" fill="#f4f5f5" stroke="${dark}" stroke-width=".6"/>
<path d="M${(-R * .07).toFixed(2)} ${-R - .5} L${(R * .07).toFixed(2)} ${-R - .5} L0 ${(-r0 + R * .04).toFixed(2)} Z" fill="${dark}"/>${dots}</svg>`;
}
export function faceDiagram(pn, h, choices, px = 132, opts = {}) {
  if (!h) return '';
  const pin = h.gender === 'pin', fill = lookFor(pn, h, choices);
  const title = `${orderPart(pn, h, choices)} mating face, schematic`;
  const contact = (x, y, r) => pin ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#222527"/>`
    : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" stroke="#222527" stroke-width="${Math.max(0.6, r * 0.28).toFixed(1)}"/>`;
  if (data.families[h.family]?.face === 'usb') {
    const R = 50;
    return `<svg class="face" viewBox="${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}" width="${px}" height="${px}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>
<circle r="${R}" fill="${fill}" stroke="#222527" stroke-width="2"/><circle r="${R * 0.82}" fill="#edeff0" stroke="#222527" stroke-opacity=".35"/><rect x="-4" y="${-R - 4}" width="8" height="${R * 0.2 + 4}" rx="2" fill="#222527"/>
<rect x="-24" y="-9" width="48" height="18" rx="2" fill="${pin ? '#222527' : '#fff'}" stroke="#222527" stroke-width="2"/><rect x="-18" y="${pin ? -3 : -6}" width="36" height="6" fill="${pin ? '#c9cbcd' : '#222527'}"/></svg>`;
  }
  if (h.family === 'D38999' && insertLayouts[h.insert_arrangement]) return d38999Face(pn, h, choices, px, opts);
  if (h.family === 'D38999') {
    const shell = shellSize[h.shell_size] || 17, R = 26 + shell * 1.5, {pts, extent} = ringLayout(h.cavity_profile || {});
    const k = (R * 0.74) / extent;
    return `<svg class="face" viewBox="${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}" width="${px}" height="${px}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>
<circle r="${R}" fill="${fill}" stroke="#222527" stroke-width="2"/><circle r="${R * 0.86}" fill="#edeff0" stroke="#222527" stroke-opacity=".35"/>
<rect x="-4" y="${-R - 4}" width="8" height="${R * 0.2 + 4}" rx="2" fill="#222527"/>
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
  const label = (x, y, t, rot) => `<text x="${x}" y="${y}" font-size="9" fill="#474d52" text-anchor="middle" font-family="Arial, sans-serif"${rot ? ` transform="rotate(-90 ${x} ${y})"` : ''}>${t}</text>`;
  const dimLines = dims ? `<g stroke="#474d52" stroke-width=".8"><line x1="0" y1="${hh + 9}" x2="${w}" y2="${hh + 9}"/><line x1="0" y1="${hh + 5}" x2="0" y2="${hh + 13}"/><line x1="${w}" y1="${hh + 5}" x2="${w}" y2="${hh + 13}"/><line x1="${w + 9}" y1="-12" x2="${w + 9}" y2="${hh}"/><line x1="${w + 5}" y1="-12" x2="${w + 13}" y2="-12"/><line x1="${w + 5}" y1="${hh}" x2="${w + 13}" y2="${hh}"/></g>${label(w / 2, hh + 20, dims.mm.width + ' mm')}${label(w + 19, (hh - 12) / 2, dims.mm.height + ' mm', true)}` : '';
  const vw = w + 8 + dimH, vh = hh + 18 + dimW;
  return `<svg class="face" viewBox="-4 -14 ${vw} ${vh}" width="${px}" height="${Math.round(px * vh / vw)}" role="img" aria-label="${esc(title)}${dims ? ', ' + dims.mm.width + ' by ' + dims.mm.height + ' mm overall' : ''}"><title>${esc(title)}</title>
${data.families[h.family]?.shells ? `<circle cx="-0.5" cy="${hh / 2}" r="3.2" fill="#fff" stroke="#222527" stroke-width="1.2"/><circle cx="${w + 0.5}" cy="${hh / 2}" r="3.2" fill="#fff" stroke="#222527" stroke-width="1.2"/>` : `<rect x="${w / 2 - 14}" y="-12" width="28" height="12" rx="3" fill="${fill}" stroke="#222527" stroke-width="1.5"/>`}
<rect x="0" y="0" width="${w}" height="${hh}" rx="9" fill="${fill}" stroke="#222527" stroke-width="2"/>
<rect x="5" y="5" width="${w - 10}" height="${hh - 10}" rx="6" fill="#edeff0" stroke="#222527" stroke-opacity=".3"/>${cells}${dimLines}</svg>`;
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
  const exact = e => e.h.family === 'D38999' && insertLayouts[e.h.insert_arrangement];
  const faces = ends.map(e => `<figure>${faceDiagram(e.pn, e.h, choices, exact(e) ? 210 : 150, {labels: exact(e) ? insertLayouts[e.h.insert_arrangement].contacts.length <= 61 : false})}<figcaption><strong>${esc(e.label)}</strong><span>${esc(e.h.ordering_incomplete ? e.h.designation + ' · code to complete' : orderPart(e.pn, e.h, choices))}</span><small>${esc(e.h.description || ((e.h.gender === 'pin' ? 'Pins' : 'Sockets') + ' · ' + mix(e.h)))}</small>${sizes(e)}</figcaption></figure>`).join('');
  const d38 = first.h.family === 'D38999';
  const links = d38 ? `<a href="${optionSources.d38999Inserts.source_url}" target="_blank" rel="noopener noreferrer">Exact ${esc(first.h.insert_arrangement)} layout on the MIL-STD-1560 chart ↗</a><a href="${optionSources.d38999KeyingChart.source_url}" target="_blank" rel="noopener noreferrer">Keying positions chart ↗</a>`
    : opts.length ? `<a href="${optionSources.dtKeys.drawing_url}" target="_blank" rel="noopener noreferrer">TE 12-way drawing ↗</a>` : '';
  const why = first.h.reference_path ? '<p class="option-help">This source-checked reference keeps its fixed finish and keying so the adapter and boot stay matched.</p>'
    : first.h.ordering_candidate ? '<p class="option-help">Glenair ordering-code candidate: finish and keying are set in the Glenair code. Ask Glenair for other options.</p>'
    : !opts.length ? `<p class="option-help">${(first.h.family === 'DT' || first.h.family === 'DTM') && [8, 12].includes(first.h.cavities) ? 'This catalog record has its key fixed in the part number. 8- and 12-position DEUTSCH housings come in keys A (gray), B (black), C (green) and D (brown); plug and receptacle must use the same key.' : first.h.family === 'DT' || first.h.family === 'DTM' ? 'Keyed colors are offered on 8- and 12-position housings. This size uses the standard housing.' : 'No finish or keying options are recorded for this part yet.'}</p>` : '';
  return `<section class="option-guide"><span class="eyebrow">YOUR CONNECTOR, FACE ON · SIZES</span><div class="faces">${faces}</div>
<p class="option-note">${data.families[first.h.family]?.face === 'usb' ? 'Schematic face view of the USB connector.' : ''}${data.families[first.h.family]?.face === 'usb' ? '</p><p hidden>' : ''}${exact(first) ? `Contact positions and IDs to scale from the MIL-STD-1560 table for arrangement ${shellSize[first.h.shell_size]}-${esc(first.h.insert_arrangement.slice(1))}, looking at each insert’s mating face. The pin insert is drawn as tabulated; the socket insert is its mirror image. Master key at top, normal (N) keying. Pins are filled, sockets are open; circle sizes are the 1560 pin and cavity diameters.` : `Schematic: shows how many contacts of each size${d38 ? '' : ' and how the cavities are arranged in rows'}. It is not the exact contact positions, spacing or cavity numbering.${d38 ? '' : ' Cavity numbers are marked on the part itself.'} Pins are filled, sockets are open.`}</p>${exact(first) ? `<details class="face-large"><summary>Large view with every position ID</summary><div class="faces">${ends.map(e => `<figure>${faceDiagram(e.pn, e.h, choices, 520, {labels: true})}<figcaption><strong>${esc(e.label)}</strong><span>${e.h.gender === 'pin' ? 'Pin insert' : 'Socket insert (mirror image)'}</span></figcaption></figure>`).join('')}</div></details><p class="option-source">Positions: <a href="${insertSource.source_url}" target="_blank" rel="noopener noreferrer">${esc(insertSource.source)}</a> (search DLA ASSIST QuickSearch for MIL-STD-1560)</p>` : ''}
<div class="option-links">${links}</div>${sizeSource(ends)}${why}${opts.map(o => picker(o, choices)).join('')}</section>`;
}
export {deutschKeys};
