const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let results=new Map(),busy=false,message='',generation=0;
export function offerPanel(line){
 if(line.total===0)return '<p class="stock">Included with the connector; no additional purchase.</p>';
 if(line.total==null)return '<p class="stock">Confirm purchase quantity before checking stock.</p>';
 const result=results.get(line.pn);if(!result)return '';
 return `<div class="live-offers"><strong>Mouser · ${esc(result.quantity)} total requested across this BOM</strong><small>Checked ${esc(new Date(result.checkedAt).toLocaleString())}</small>${result.offers.length?result.offers.map(o=>`<div class="live-offer"><strong>${esc(o.manufacturer)}</strong><small>MPN: ${esc(o.mpn)} · Mouser: ${esc(o.sku)}</small><p>${o.stock==null?esc(o.availability):`${o.stock.toLocaleString()} in stock`}${o.enoughStock===false?' · insufficient for order quantity':''}</p><p>${o.unitPrice?`${esc(o.unitPrice)} ${esc(o.currency)} each at ${o.orderQuantity} units`:'Price for this quantity not available'}<br>Minimum: ${esc(o.minimum??'unknown')} · Multiple: ${esc(o.multiple??'unknown')}</p>${o.orderQuantity!=null&&o.orderQuantity!==result.quantity?`<p>Order quantity rounds up to ${o.orderQuantity}.</p>`:''}${o.leadTime?`<small>Lead time: ${esc(o.leadTime)}</small>`:''}${o.restriction?`<p>${esc(o.restriction)}</p>`:''}${o.url?`<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">View at Mouser ↗</a>`:'<small>Product link not supplied.</small>'}</div>`).join(''):'<p>No exact manufacturer part-number match returned. This does not establish that the part is unavailable.</p>'}<small>Part-number match only. Verify manufacturer and specifications. Price and stock may change; confirm at checkout.</small></div>`;
}
export function stockControls(){return `<section class="note"><strong>Check distributor availability</strong><p>Look up exact BOM part numbers at Mouser. Included items and unresolved purchase quantities are skipped.</p><button class="secondary" data-action="check-stock" ${busy?'disabled':''}>${busy?'Checking Mouser…':'Check Mouser stock & prices'}</button><p role="status">${esc(message)}</p></section>`;}
export function clearOffers(){generation++;results.clear();message='';}
export async function checkOffers(lines,render){
 if(busy)return;const run=generation;busy=true;results.clear();message='Checking exact part numbers…';render();
 const grouped=new Map();for(const l of lines)if(/^[A-Za-z0-9][A-Za-z0-9/._-]{2,39}$/.test(l.pn||'')&&l.total>0)grouped.set(l.pn,(grouped.get(l.pn)||0)+l.total);
 const items=[...grouped].map(([pn,quantity])=>({pn,quantity}));
 try{for(let i=0;i<items.length;i+=10){const r=await fetch('/api/offers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items.slice(i,i+10)})});let body;try{body=await r.json();}catch{throw Error('The distributor service is unavailable.');}if(run!==generation)return;if(!r.ok)throw Error(body.error||'Lookup failed.');for(const item of body.results)results.set(item.pn,item);}
 message=items.length?'Lookup complete. Results appear beneath each part.':'No exact part numbers with confirmed purchase quantities to check.';
 }catch(e){if(run===generation)message=e.message;}finally{busy=false;render();}
}
