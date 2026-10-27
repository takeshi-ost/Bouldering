'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const policies=require('./policy.cjs');
function createServer(root=path.join(__dirname,'public')) {
 const files=new Map();
 function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.'))continue;const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else if(e.isFile())files.set('/'+path.relative(root,p).split(path.sep).join('/'),p);}}
 scan(root);files.set('/',path.join(root,'index.html'));
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
 const server=http.createServer((req,res)=>{
 const route=(req.url||'').split('?')[0];
 const localOrigin='http://127.0.0.1:'+server.address().port;
 const localPolicy=(route.startsWith('/game/')?policies.game:policies.shell).replaceAll('https://ascent-route-lab.activeboar15.chatgpt.site',localOrigin);
 res.setHeader('Content-Security-Policy',localPolicy);
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
 const file=files.get(route);if(!file){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
 if(req.method==='HEAD')return res.end();
 if(path.extname(file)==='.html')return res.end(fs.readFileSync(file,'utf8').replaceAll('https://ascent-route-lab.activeboar15.chatgpt.site',localOrigin));
 fs.createReadStream(file).pipe(res);
 });
 return server;
}
if(require.main===module){const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';createServer().listen(port,host,()=>console.log(`Route Lab: http://${host}:${port}`));}
module.exports={createServer};
