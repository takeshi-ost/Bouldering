const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({console});
vm.runInContext(`const elements={}; const document={getElementById(id){return elements[id]||(elements[id]={style:{},classList:{toggle(){}},focus(){},addEventListener(){},getContext(){return new Proxy({}, {get(o,k){return o[k]||function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}});}}; const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`, context);
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/<script src="([^"]+)" defer><\/script>/g))
    vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),context,{filename:match[1]});
for(let n=Number(process.argv[2]||1);n<=Number(process.argv[3]||6);n++) {
    const result=vm.runInContext(`reset(${n}); ({level,HEIGHT,holds:holds.map(h=>({id:h.id,x:Math.round(h.x),y:Math.round(h.y),type:h.type})),route:route.map(p=>({x:Math.round(p.x),y:Math.round(p.y),anchor:p.anchor,grips:p.grips}))})`,context);
    console.log(JSON.stringify(result));
}
