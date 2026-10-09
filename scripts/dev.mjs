import http from 'node:http';
import fs from 'node:fs';
import worker from '../dist/server/index.js';
const line=fs.existsSync('.env')?fs.readFileSync('.env','utf8').split(/\r?\n/).find(l=>l.startsWith('MOUSER_API_KEY=')):'';
const env={MOUSER_API_KEY:line?.slice('MOUSER_API_KEY='.length).trim()||process.env.MOUSER_API_KEY||''};
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const request=new Request('http://localhost:8000'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Request failed');}}).listen(8000,'127.0.0.1',()=>console.log('MateWise running at http://localhost:8000'));
