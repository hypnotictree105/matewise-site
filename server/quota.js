// One global object reserves calls before contacting Mouser. Rolling windows also
// cover provider resets in other timezones. Calls outside this site are not counted.
export function reserve(history,now){
 const active=history.filter(t=>now-t<86400000);
 if(active.length>=900||active.filter(t=>now-t<60000).length>=25)return {ok:false,history:active};
 return {ok:true,history:[...active,now]};
}
export class MouserQuota {
 constructor(ctx){this.ctx=ctx;}
 async fetch(){
  const ok=await this.ctx.storage.transaction(async tx=>{
   const result=reserve(await tx.get('calls')||[],Date.now());
   if(result.ok)await tx.put('calls',result.history);
   return result.ok;
  });
  return Response.json({ok});
 }
}
