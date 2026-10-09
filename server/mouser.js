const norm=v=>String(v||'').trim().toUpperCase();
const integer=v=>/^\d+$/.test(String(v??'').replaceAll(',',''))?Number(String(v).replaceAll(',','')):null;
export function normalizeOffers(parts,pn,quantity){
 return parts.filter(p=>norm(p.ManufacturerPartNumber)===norm(pn)).map(p=>{
  let url=null;try{const u=new URL(p.ProductDetailUrl);if(u.protocol==='https:'&&(u.hostname==='mouser.com'||u.hostname.endsWith('.mouser.com')))url=u.href;}catch{}
  const minimum=integer(p.Min),multiple=integer(p.Mult),stock=integer(p.AvailabilityInStock);
  const orderQuantity=minimum>0&&multiple>0?Math.ceil(Math.max(quantity,minimum)/multiple)*multiple:null;
  const tier=orderQuantity==null?null:(p.PriceBreaks||[]).filter(b=>Number(b.Quantity)>0&&Number(b.Quantity)<=orderQuantity).sort((a,b)=>Number(b.Quantity)-Number(a.Quantity))[0];
  return {mpn:p.ManufacturerPartNumber,manufacturer:p.Manufacturer||'Not supplied',sku:p.MouserPartNumber,url,stock,availability:p.Availability||'Not reported',leadTime:p.LeadTime||'',minimum,multiple,requestedQuantity:quantity,orderQuantity,unitPrice:tier?.Price||null,currency:tier?.Currency||null,priceBreak:tier?.Quantity||null,restriction:p.RestrictionMessage||'',enoughStock:stock==null||orderQuantity==null?null:stock>=orderQuantity};
 });
}
export async function searchMouser(items,key,fetcher=fetch){
 const response=await fetcher('https://api.mouser.com/api/v1/search/partnumber?apiKey='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({SearchByPartRequest:{mouserPartNumber:items.map(i=>i.pn).join('|'),partSearchOptions:'Exact'}}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error(response.status===429?'rate_limit':'provider_error');
 const body=await response.json();
 if(body.Errors?.length)throw new Error('provider_error');
 if(!Array.isArray(body.SearchResults?.Parts))throw new Error('provider_error');
 const checkedAt=new Date().toISOString();
 return items.map(i=>({pn:i.pn,quantity:i.quantity,checkedAt,offers:normalizeOffers(body.SearchResults.Parts,i.pn,i.quantity)}));
}
