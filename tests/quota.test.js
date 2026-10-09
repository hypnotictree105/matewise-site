import test from 'node:test';
import assert from 'node:assert/strict';
import {reserve,MouserQuota} from '../server/quota.js';
test('global limits apply to rolling minute and day windows',()=>{
 const now=100000000;
 assert.equal(reserve(Array(25).fill(now-1000),now).ok,false);
 assert.equal(reserve(Array(900).fill(now-120000),now).ok,false);
 assert.equal(reserve(Array(900).fill(now-86400001),now).ok,true);
});
test('reservations persist across object instances',async()=>{
 let history=[];const ctx={storage:{transaction:async fn=>fn({get:async()=>history,put:async(k,v)=>{history=v;}})}};
 for(let n=0;n<25;n++)assert.equal((await (await new MouserQuota(ctx).fetch()).json()).ok,true);
 assert.equal((await (await new MouserQuota(ctx).fetch()).json()).ok,false);
});
