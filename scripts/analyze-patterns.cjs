const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),context=vm.createContext({console});
vm.runInContext(`const elements={};const document={getElementById(id){return elements[id]||(elements[id]={style:{},classList:{toggle(){}},focus(){},addEventListener(){},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}});}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`,context);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script src="([^"]+)" defer><\/script>/g))vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),context,{filename:m[1]});
console.log(vm.runInContext(`
const report=[];
for(let n=2;n<=20;n++) {
 reset(n);
 const original={holds,route,initialGrips},candidates=[];
 for(let i=2;i<original.route.length-2;i++){
  const a=original.route[i-1],b=original.route[i],goal=original.holds.find(h=>h.type==='goal');
  if(b.y<a.y || Math.abs(b.x-a.x)<50 || distance(b,goal)<=distance(a,goal))continue;
  route=original.route.slice(i-1);
  const used=new Set(route.flatMap(p=>p.grips||[]));
  holds=original.holds.filter(h=>used.has(h.id));
  initialGrips=route[0].grips.map(id=>holds.find(h=>h.id===id));
  const fresh=b.grips.filter(id=>!a.grips.includes(id));
  for(const id of fresh){
   const saved=holds;holds=holds.filter(h=>h.id!==id);
   const alt=solveRoute(route,route.length-1);
   holds=saved;
   candidates.push({step:i,removed:id,alt:alt?.length||null,moves:route.length-1});
  }
 }
 ({holds,route,initialGrips}=original);
 report.push({n,candidates});
}
JSON.stringify(report)
`,context));
