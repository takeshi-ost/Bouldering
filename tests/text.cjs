const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html'),context=vm.createContext({});
vm.runInContext(read('js/text-ja.js')+'\n'+read('js/text-en.js')+'\n'+read('js/text-dev-ja.js')+'\n'+read('js/text.js')+'\nglobalThis.copy={catalog:{...GAME_TEXT_JA,...GAME_DEV_TEXT_JA},playerCatalog:GAME_TEXT_JA,devCatalog:GAME_DEV_TEXT_JA,text:gameText,apply:applyGameText};',context);
const {catalog,playerCatalog,devCatalog,text,apply}=context.copy;
const english=vm.runInContext('GAME_TEXT_EN',context);
assert.deepEqual(Object.keys(english).sort(),Object.keys(playerCatalog).sort());
for(const key of Object.keys(playerCatalog)) {
 assert(english[key].length>0);
 const placeholders=s=>[...s.matchAll(/\{(value\d+)\}/g)].map(m=>m[1]).sort();
 assert.deepEqual(placeholders(english[key]),placeholders(playerCatalog[key]),key);
}
// Every definition, including parameterized errors/aria labels, must preserve its copy.
for(const [key,value]of Object.entries(catalog)) {
 assert.equal(typeof value,'string');assert(!/[<>]/.test(value),'Markup belongs to the renderer: '+key);
 const args=Object.fromEntries([...value.matchAll(/\{(value\d+)\}/g)].map(m=>[m[1],'岳志 {value99} $& < > "\n']));
 const expected=value.replace(/\{(value\d+)\}/g,(_,name)=>args[name]);
 assert.equal(text(key,args),expected,key);
}
assert.throws(()=>text('missing.key'),/Unknown game text key/);
assert.throws(()=>text('label.stage'),/Missing game text value/);
assert.equal(text('label.stage',{value0:47}),'STAGE 47');
assert.equal(text('game.formatStageRecord',{value0:18,value1:'00:30:12'}),'18ムーブ 00:30:12');
assert.equal(text('date.monthDayWeekday',{value0:'10',value1:'24',value2:'土'}),'10月24日(土)');
const nodes=[...html.matchAll(/<([a-zA-Z][\w-]*)\b([^<>]*)>/g)].map(match=>{
 const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 return {attrs,textContent:'',getAttribute:k=>attrs[k],setAttribute(k,v){attrs[k]=v;}};
});
const doc={querySelectorAll(selector){const attr=selector.slice(1,-1);return nodes.filter(node=>Object.hasOwn(node.attrs,attr));}};
apply(doc);apply(doc);
let bindings=0;
for(const node of nodes)for(const [attribute,key]of Object.entries(node.attrs))if(attribute.startsWith('data-i18n')) {
 assert(Object.hasOwn(catalog,key),'Missing HTML key '+key);bindings++;
 assert.equal(attribute==='data-i18n'?node.textContent:node.attrs[attribute.slice(10)],catalog[key]);
}
assert(bindings>100);
for(const key of Object.keys(devCatalog))assert(!Object.hasOwn(playerCatalog,key));
const scripts=[...html.matchAll(/<script(?: type="module")? src="([^"?]+)/g)].map(m=>m[1]);
assert.deepEqual(scripts.slice(0,5),['js/text-ja.js','js/text-en.js','js/text-dev-ja.js','js/text.js','js/config.js']);
for(const file of scripts.filter(p=>!['js/text-ja.js','js/text-en.js','js/text-dev-ja.js'].includes(p))) {
 const source=read(file);
 for(const match of source.matchAll(/gameText\("([^"]+)"/g))assert(Object.hasOwn(catalog,match[1]),file+': '+match[1]);
 // Japanese comments are allowed; Japanese string literals must live in the dictionary.
 const code=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert(!/[\u3040-\u30ff\u3400-\u9fff]/.test(code),'Unextracted copy: '+file);
}
// Check both directions: every reference exists and every definition has a caller.
const sourceFiles=['index.html',...scripts.filter(file=>!file.startsWith('js/text'))];
const source=sourceFiles.map(read).join('\n');
const refs=new Set([...source.matchAll(/(?:gameText\(["']|data-i18n(?:-[\w-]+)?=")([^"']+)["']/g)].map(m=>m[1]));
for(const key of ['tips.scroll','tips.undo','tips.reach','tips.wideHold','tips.goal','tips.heart','tips.sideways','tips.appearance'])refs.add(key);
for(const key of ['course.short','course.medium','course.long'])refs.add(key);
for(const day of ['sun','mon','tue','wed','thu','fri','sat'])refs.add('date.weekday.'+day);
for(const key of Object.keys(catalog))assert(refs.has(key),'Unused dictionary entry: '+key);
console.log(`PASS text: ${Object.keys(catalog).length} source strings, ${bindings} static bindings, all JS/HTML keys, unchanged dynamic formats, literal substitution, errors and idempotent safe DOM initialization`);
