const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  fs.readFile(fp, (err,data)=>{
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(fp)]||'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(data);
  });
}).listen(8099, ()=>console.log('serving on http://localhost:8099'));
