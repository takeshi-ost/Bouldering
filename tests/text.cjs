const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html'),context=vm.createContext({});
vm.runInContext(read('js/text-ja.js')+'\n'+read('js/text-en.js')+'\n'+read('js/text-dev-ja.js')+'\n'+read('js/text.js')+'\nglobalThis.copy={catalog:{...GAME_TEXT_JA,...GAME_DEV_TEXT_JA},playerCatalog:GAME_TEXT_JA,devCatalog:GAME_DEV_TEXT_JA,text:gameText,apply:applyGameText};',context);
const {catalog,playerCatalog,devCatalog,text,apply}=context.copy;
const english=vm.runInContext('GAME_TEXT_EN',context);
assert.deepEqual(Object.keys(english).sort(),Object.keys(catalog).sort());
// Both catalogs describe the same current app, including deliberately omitted
// help blocks and developer/account-management controls.
for(const key of Object.keys(catalog)) {
 assert.equal(english[key]==='',catalog[key]==='',key+' empty-block parity');
 const placeholders=s=>[...s.matchAll(/\{(value\d+)\}/g)].map(m=>m[1]).sort();
 assert.deepEqual(placeholders(english[key]),placeholders(catalog[key]),key);
 assert(!/[\u3040-\u30ff\u3400-\u9fff]/.test(english[key]) || key==='ui.languageChoice.option','Untranslated English: '+key);
}
// Owner-authored result Tips: exactly seven, in requested order. The former
// large-hold and sideways entries must no longer enter the random selection.
const expectedTipKeys=['tips.scroll','tips.undo','tips.reach','tips.goal','tips.heart','tips.cancel','tips.appearance'];
const expectedTips={ja:[
 '画面端か2本スワイプでスクロール！',
 'ボディをタップで1ムーブ戻せるよ！',
 '動けないときは手足の伸びをチェック！',
 'ゴールは両足の支えも忘れずに！',
 'スタミナ+2はボディでタッチ！',
 'ムーブは2本タッチでキャンセルできる！',
 '設定から見た目と名前が変えられるよ！'
],en:[
 'Swipe along the screen edge or with two fingers to scroll!',
 'Tap your body to undo one move!',
 'Can’t move? Check how far your arms and legs are stretched!',
 'Keep both feet supported at the goal!',
 'Touch Stamina +2 with your body!',
 'Touch with two fingers to cancel your current move!',
 'Change your look and name in Settings!'
]};
vm.runInContext(read('js/config.js'),context);
assert.deepEqual(Array.from(vm.runInContext('GAMEPLAY_TIP_KEYS',context)),expectedTipKeys);
for(const [locale,expected] of Object.entries(expectedTips)) {
 vm.runInContext('setGameLanguage('+JSON.stringify(locale)+');',context);
 assert.deepEqual(expectedTipKeys.map(key=>text(key)),expected);
 const dictionary=locale==='ja'?playerCatalog:english;
 assert.deepEqual(Object.keys(dictionary).filter(key=>key.startsWith('tips.')).sort(),[...expectedTipKeys].sort());
}
vm.runInContext("setGameLanguage('ja');",context);
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
assert.deepEqual(scripts.slice(0,7),['js/tutorial-state.js','js/text-ja.js','js/text-en.js','js/text-dev-ja.js','js/text.js','js/score-metadata.js','js/config.js']);
assert(scripts.indexOf('js/course-progression-config.js')>scripts.indexOf('js/config.js'));assert(scripts.indexOf('js/difficulty-config.js')>scripts.indexOf('js/course-progression.js'));assert(scripts.indexOf('js/difficulty-config.js')<scripts.indexOf('js/difficulty.js'));
for(const file of scripts.filter(p=>!['js/text-ja.js','js/text-en.js','js/text-dev-ja.js'].includes(p))) {
 const source=read(file);
 for(const match of source.matchAll(/gameText\("([^"]+)"/g))assert(Object.hasOwn(catalog,match[1]),file+': '+match[1]);
 // Japanese comments are allowed; Japanese string literals must live in the dictionary.
 const code=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert(!/[\u3040-\u30ff\u3400-\u9fff]/.test(code),'Unextracted copy: '+file);
}
// Check both directions: every reference exists and every definition has a caller.
const sourceFiles=['index.html','scripts/formal-debug-seed.js',...scripts.filter(file=>!file.startsWith('js/text'))];
const source=sourceFiles.map(read).join('\n');
const refs=new Set([...source.matchAll(/(?:gameText\(["']|data-i18n(?:-[\w-]+)?=")([^"']+)["']/g)].map(m=>m[1]));
// Artifact-only controls select among literal localization keys by state.
for(const match of source.matchAll(/["'](formal\.[a-zA-Z.]+)["']/g)){assert(Object.hasOwn(catalog,match[1]));refs.add(match[1]);}
for(const key of ['tips.scroll','tips.undo','tips.reach','tips.goal','tips.heart','tips.cancel','tips.appearance'])refs.add(key);
for(const match of source.matchAll(/(?:labelKey|titleKey|textKey|altKey):[\s]*['"]([^'"]+)['"]/g)){assert(Object.hasOwn(catalog,match[1]),'Missing definition label '+match[1]);refs.add(match[1]);}
for(const day of ['sun','mon','tue','wed','thu','fri','sat'])refs.add('date.weekday.'+day);
for(const key of Object.keys(catalog))assert(refs.has(key),'Unused dictionary entry: '+key);
console.log(`PASS text: ${Object.keys(catalog).length} source strings, ${bindings} static bindings, all JS/HTML keys, unchanged dynamic formats, literal substitution, errors and idempotent safe DOM initialization`);
