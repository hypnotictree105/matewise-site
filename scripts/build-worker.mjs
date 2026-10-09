import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {data,exactPart} from '../public/engine.js';
import {capFor} from '../public/dust-caps.js';
for(const file of fs.readdirSync('public').filter(f=>f.endsWith('.js')).map(f=>'public/'+f).concat(['server/mouser.js','server/worker.js']))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
const parts=new Set(Object.keys(data.housings));
function collect(v){if(!v||typeof v!=='object')return;if(exactPart(v.pn))parts.add(v.pn);for(const x of Object.values(v))collect(x);}collect(data);
for(const pn of Object.keys(data.housings)){const cap=capFor(pn);if(cap)parts.add(cap.pn);}
const assets={},mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else assets['/'+path.relative('public',file).split(path.sep).join('/')]={type:mime[path.extname(file)]||'application/octet-stream',data:fs.readFileSync(file).toString('base64')};}}walk('public');
const root=path.resolve('.'),dist=path.resolve('dist');if(path.dirname(dist)!==root)throw Error('Unsafe build path');fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync('dist/server',{recursive:true});fs.copyFileSync('server/worker.js','dist/server/index.js');fs.copyFileSync('server/mouser.js','dist/server/mouser.js');
fs.writeFileSync('dist/server/assets.js','export const assets='+JSON.stringify(assets)+';\nexport const allowedParts='+JSON.stringify([...parts])+';\n');
fs.copyFileSync('server/quota.js','dist/server/quota.js');
await import('../dist/server/index.js');console.log('Worker and public assets validated; secrets excluded.');
