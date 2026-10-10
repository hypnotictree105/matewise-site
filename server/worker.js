import {searchMouser} from './mouser.js';
import {assets,allowedParts} from './assets.js';
export {MouserQuota} from './quota.js';
export {FunnelStats} from './analytics.js';
import {cleanEvent} from './analytics.js';
const allowed=new Set(allowedParts);
let recent=[],events=[];
const sameKey=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;};
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/health')return json({service:'MateWise distributor lookup',configured:!!env.MOUSER_API_KEY});
  if(url.pathname==='/api/offers'){
   if(request.method!=='POST')return json({error:'Use POST.'},405);
   if(request.headers.get('Origin')!==url.origin)return json({error:'Same-site requests only.'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
   if(!env.MOUSER_API_KEY)return json({error:'Mouser is not connected yet. The site owner needs to configure the API key.',code:'not_configured'},503);
   const text=await request.text();if(text.length>12000)return json({error:'Request too large.'},413);
   let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid JSON.'},400);}
   if(!Array.isArray(body.items)||!body.items.length||body.items.length>10)return json({error:'Send 1–10 parts.'},400);
   if(body.items.some(i=>!i||!allowed.has(i.pn)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>1280000)||new Set(body.items.map(i=>i.pn)).size!==body.items.length)return json({error:'Invalid catalog part or quantity.'},400);
   if(env.MOUSER_QUOTA){
    try{const guard=env.MOUSER_QUOTA.get(env.MOUSER_QUOTA.idFromName('global'));const decision=await guard.fetch('https://quota/reserve');if(!decision.ok||!(await decision.json()).ok)return json({error:'Stock lookup limit reached. Please try again later.',code:'rate_limit'},429);}catch{return json({error:'Stock lookup is temporarily unavailable.',code:'quota_unavailable'},503);}
   }else if(env.REQUIRE_GLOBAL_QUOTA==='true')return json({error:'Stock lookup is temporarily unavailable.',code:'quota_unavailable'},503);
   const now=Date.now();recent=recent.filter(t=>now-t<60000);if(recent.length>=25)return json({error:'Please wait a minute before checking again.',code:'rate_limit'},429);recent.push(now);
   try{return json({results:await searchMouser(body.items,env.MOUSER_API_KEY)});}catch(e){return json({error:e.message==='rate_limit'?'Mouser’s request limit was reached. Try again later.':'Mouser could not complete this lookup. Check the API key or try again later.',code:e.message==='rate_limit'?'rate_limit':'provider_error'},502);}
  }
  if(url.pathname==='/api/event'){
   // Anonymous funnel events. Always answers 204 so analytics can never break the site.
   if(request.method!=='POST'||request.headers.get('Origin')!==url.origin)return new Response(null,{status:204});
   const now=Date.now();events=events.filter(t=>now-t<60000);if(events.length>=600)return new Response(null,{status:204});events.push(now);
   const text=await request.text();if(text.length>4096||!env.ANALYTICS)return new Response(null,{status:204});
   let event;try{event=cleanEvent(JSON.parse(text),allowed);}catch{event=null;}
   if(event){const stub=env.ANALYTICS.get(env.ANALYTICS.idFromName('global'));const work=stub.fetch('https://analytics/record',{method:'POST',body:JSON.stringify(event)}).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(work);else await work;}
   return new Response(null,{status:204});
  }
  if(url.pathname==='/api/stats'){
   if(!env.STATS_KEY||!env.ANALYTICS)return json({error:'Stats are not configured yet. Add a STATS_KEY secret to the Worker.',code:'not_configured'},503);
   const auth=request.headers.get('Authorization')||'';
   if(!sameKey(auth.replace(/^Bearer /,''),env.STATS_KEY))return json({error:'Wrong stats key.'},401);
   const days=Math.min(365,Math.max(1,Number(url.searchParams.get('days'))||30));
   const stub=env.ANALYTICS.get(env.ANALYTICS.idFromName('global'));
   try{return json(await (await stub.fetch('https://analytics/summary?days='+days)).json());}catch{return json({error:'Stats are temporarily unavailable.'},503);}
  }
  if(url.pathname.startsWith('/api/'))return json({error:'Not found.'},404);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const asset=assets[url.pathname==='/'?'/index.html':url.pathname==='/stats'?'/stats.html':url.pathname];
  if(!asset)return new Response('Not found',{status:404});
  const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
 }
};
