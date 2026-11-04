'use strict';
// Static author-cascade verification, not browser rendering/UA-style coverage.
// Only simple selectors, attributes, :not(), descendants/children and states
// used by these controls are evaluated. Media rules are included: tested color
// and pointer/focus properties must remain safe regardless of those media conditions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('styles.css');
const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
const rules=[...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>!m[1].trim().startsWith('@'));
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g)].map(m=>[m[1],m[2]??m[3]??m[4]??'']));
let nextNodeId=0;
const node=(tag,a={},parent=null)=>({tag,a,parent,states:[],pseudo:'',cacheId:nextNodeId++});
function parseHTML(html){const nodes=[],stack=[];for(const m of html.matchAll(/<\/?([\w-]+)\b([^>]*)>/g)){const tag=m[1];if(m[0][1]==='/'){while(stack.length&&stack.pop().tag!==tag){}continue;}const n=node(tag,attrs(m[2]),stack.at(-1));nodes.push(n);if(!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag)&&!m[0].endsWith('/>'))stack.push(n);}return nodes;}
const nodes=parseHTML(read('index.html'));
function part(s,n){if(!n)return false;let ok=true;
 s=s.replace(/:not\(([^()]*)\)/g,(_,p)=>{if(part(p,{...n,pseudo:''}))ok=false;return '';});
 s=s.replace(/::([\w-]+)/g,(_,p)=>{if(n.pseudo!==p)ok=false;return '';});
 if(n.pseudo&&!/::/.test(arguments[0]))return false;
 s=s.replace(/\[([\w-]+)(?:([~|^$*]?=)["']?([^\]"']*)["']?)?\]/g,(_,k,op,v)=>{const x=n.a[k];if(x===undefined||(op==='='&&x!==v)||(op==='$='&&!x.endsWith(v)))ok=false;return '';});
 s=s.replace(/#([\w-]+)/g,(_,id)=>{if(n.a.id!==id)ok=false;return '';});
 s=s.replace(/\.([\w-]+)/g,(_,c)=>{if(!(n.a.class||'').split(/\s+/).includes(c))ok=false;return '';});
 s=s.replace(/:([\w-]+)/g,(_,p)=>{if(p==='disabled'?!(n.states.includes(p)||'disabled'in n.a):!n.states.includes(p))ok=false;return '';});
 return ok&&(s===''||s==='*'||s===n.tag);
}
function matches(s,n){const tokens=s.trim().replace(/\s*>\s*/g,' > ').split(/\s+/);if(!part(tokens.pop(),n))return false;let ancestor=n.parent;while(tokens.length){const t=tokens.pop();if(t==='>'){if(!part(tokens.pop(),ancestor))return false;ancestor=ancestor.parent;}else{while(ancestor&&!part(t,ancestor))ancestor=ancestor.parent;if(!ancestor)return false;ancestor=ancestor.parent;}}return true;}
const variables={};for(const rule of rules.filter(r=>r[1].trim()===':root'))for(const m of rule[2].matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g))variables[m[1]]=m[2].trim();
function resolve(v,vars){for(let i=0;i<8;i++)v=v.replace(/var\((--[\w-]+)\)/g,(_,k)=>vars[k]??`UNRESOLVED:${k}`);return v;}
// Cache identical ancestor/state cascades so exhaustive focus combinations
// remain quick. The last rule keys each isolated mutation witness separately.
const styleCache=new Map();
const nodeKey=n=>n?[n.cacheId,n.pseudo,n.states.join(','),nodeKey(n.parent)].join('|'):'';
function style(n){const key=[rules.length,rules.at(-1)[1],rules.at(-1)[2],nodeKey(n)].join('\n');if(styleCache.has(key))return styleCache.get(key);const result={},ranks={};let order=0;function put(k,v,rank){if(!ranks[k]||rank>=ranks[k]){ranks[k]=rank;result[k]=v;}}
 for(const r of rules){for(const selector of r[1].trim().split(',')){if(!matches(selector,n))continue;const s=selector.replace(/:not\(([^()]*)\)/g,'$1');const rank=((s.match(/#[\w-]+/g)||[]).length*10000+(s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g)||[]).length*100+(s.match(/(?:^|\s|>)[a-z][\w-]*/g)||[]).length)*100000+order;for(const d of r[2].split(';')){const i=d.indexOf(':');if(i<0)continue;put(d.slice(0,i).trim(),d.slice(i+1).trim().replace(/\s*!important$/,''),rank+(d.includes('!important')?1e12:0));}}order++;}
 for(const d of (n.a.style||'').split(';')){const i=d.indexOf(':');if(i>0)put(d.slice(0,i).trim(),d.slice(i+1).trim(),1e11);}const inherited=n.pseudo?style({...n,pseudo:''}):n.parent?style(n.parent):variables;const vars={...variables,...Object.fromEntries(Object.entries(inherited).filter(([k])=>k.startsWith('--'))),...Object.fromEntries(Object.entries(result).filter(([k])=>k.startsWith('--')))};const resolved={...vars,...Object.fromEntries(Object.entries(result).map(([k,v])=>[k,resolve(v,vars)]))};styleCache.set(key,resolved);return resolved;}
// Isolated resolver proof: element-local variables must not leak into root
// tokens or neighboring buttons, and declaration order must not matter.
rules.push(['','#cascadeProbe','background:var(--button-bg);--button-bg:#abcdef;']);
assert.equal(style(node('button',{id:'cascadeProbe'})).background,'#abcdef');
assert.equal(style(node('button')).background,'#c8d4d7');rules.pop();
const byId=id=>{const n=nodes.find(n=>n.a.id===id);assert(n,id);return n;};
assert.equal(variables['--button-bg'],'#c8d4d7');assert.equal(variables['--button-fg'],'#263e48');
function luminance(hex){return hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);}
const contrast=(luminance('#c8d4d7')+.05)/(luminance('#263e48')+.05);assert(contrast>=4.5);
const ratio=(a,b)=>{const [low,high]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (high+.05)/(low+.05);};
assert.equal(variables['--button-keyboard-bg'],undefined,'Unused keyboard palette removed');
assert.equal(variables['--button-focus'],undefined,'Selection colors are not focus tokens');
assert(ratio(variables['--button-selected'],variables['--button-selected-contrast'])>=4.5,'Selected-color check contrast');
assert(luminance(variables['--button-bg'])<luminance('#eee9df'),'Button is darker than the unchanged plate');
const artwork=n=>/(?:^|\s)(?:settings-button|daily-airship|map-page|modal-close|modal-tap)(?:\s|$)/.test(n.a.class||'');
const controls=nodes.filter(n=>n.tag==='button');controls.push(node('button',{id:'pagesTrialSeedOpenTitle'}),node('button',{id:'pagesTrialSeedOpenSettings'}));

const pointerStates=[[],['hover'],['active'],['hover','active'],['disabled'],['disabled','hover'],['disabled','active']];
const focusStates=[['focus'],['focus-visible'],['focus','focus-visible']];
const statesList=[[],['hover'],['active'],['hover','active'],['focus'],['focus-visible'],['focus','focus-visible'],['hover','focus','focus-visible'],['active','focus','focus-visible']];
// Browser focus, including autofocus, must never change a touch/mouse control.
// Also test focused descendants and pseudo-elements against their own rest state.
function unchangedByFocus(n,focusTarget=n){const saved=focusTarget.states;try{for(const states of pointerStates){focusTarget.states=states;const expected=style(n);for(const focus of focusStates){focusTarget.states=[...states,...focus];assert.deepEqual(style(n),expected,(n.a.id||n.a.class||n.tag)+' '+n.pseudo+' changes on '+focusTarget.states);}}}finally{focusTarget.states=saved;}}
function undecorated(n,label=n.a.id||n.a.class||n.tag){const s=style(n);for(const key of ['text-decoration','text-shadow','box-shadow']){const calendarRing=key==='box-shadow'&&n.pseudo==='before'&&(n.a.class||'').split(' ').includes('daily-day')&&(n.a.class||'').split(' ').includes('is-selected');assert.equal(s[key]??'none',calendarRing?'inset 0 0 0 2px #478bc6':'none',label+' '+n.states+' '+n.pseudo+' '+key);}if((n.a.class||'').split(' ').includes('map-marker')&&!n.pseudo)assert.equal(s.filter,'drop-shadow(0 2px 1px #25372f30)','original avatar shadow unchanged');else assert(!s.filter?.includes('drop-shadow'),label+' filter shadow');return s;}
function allStates(n){for(const states of statesList){n.states=states;undecorated(n);for(const pseudo of ['before','after']){n.pseudo=pseudo;undecorated(n);}n.pseudo='';}n.states=[];for(const pseudo of ['', 'before','after']){n.pseudo=pseudo;unchangedByFocus(n);}n.pseudo='';}
for(const n of controls){allStates(n);for(const states of statesList){n.states=states;const s=style(n);assert.equal(s.border,'0',n.a.id+' border');assert.equal(s.outline,'none',n.a.id+' outline');if(artwork(n)){assert.equal(s.background,'transparent',n.a.id+' artwork');}else{assert.equal(s.background,'#c8d4d7',n.a.id+' fill');assert.equal(s.color,'#263e48',n.a.id+' text');}}n.states=['disabled','hover'];const s=style(n);assert(Number(s.opacity)<1,n.a.id+' disabled');assert.equal(s.filter,'none',n.a.id+' disabled hover');n.states=[];}
const crosses=controls.filter(n=>(n.a.class||'').split(' ').includes('modal-close'));
assert.deepEqual(crosses.map(n=>n.a.id).sort(),['closeHelp','closeLife','closeResult','closeSettings','closeStageStart','transferClose']);
for(const n of crosses)for(const states of statesList){n.states=states;const s=style(n);for(const [key,value] of Object.entries({width:'44px',height:'44px',top:'4px',right:'4px',padding:'0','font-size':'24px','line-height':'1'}))assert.equal(s[key],value,n.a.id+' '+key);}crosses.forEach(n=>n.states=[]);
const download=byId('transferDownload');allStates(download);assert.equal(style(download).background,'#c8d4d7');download.states=['focus-visible'];assert.equal(style(download).background,'#c8d4d7');
const map=node('button',{class:'map-node','aria-current':'step'}),day=node('button',{class:'daily-day is-selected'});for(const n of [map,day]){allStates(n);n.states=['focus-visible'];assert.equal(style(n).background,'transparent');assert.equal(style(n).outline,'none');}
map.states=['disabled'];assert.equal(style(map).opacity,'1','locked map artwork uses its own disabled appearance');
const swatch=node('button',{'aria-pressed':'true',style:'background:#e0b99b'},node('div',{class:'palette-swatches'}));allStates(swatch);for(const states of statesList){swatch.states=states;assert.equal(style(swatch).background,'#e0b99b');assert.equal(style(swatch).border,'0');}swatch.pseudo='after';assert.equal(style(swatch).content,'"✓"','selected color has a non-color check');
const title=byId('titleScreen'),titleTap=nodes.find(n=>(n.a.class||'').split(' ').includes('title-tap'));
allStates(title);allStates(titleTap);
for(const states of statesList){title.states=states;undecorated(title);undecorated(titleTap);assert.equal(style(titleTap)['-webkit-text-stroke'],'2px #fff','original TAP stroke preserved');}title.states=[];unchangedByFocus(titleTap,title);
for(const n of [node('span',{class:'map-marker map-opponent',role:'button'}),node('rect',{'data-stripe':'0',role:'button',fill:'#39785b'},node('svg',{class:'editor-preview'})),node('circle',{'data-part':'head',role:'button',fill:'#e0b99b'},node('svg',{class:'editor-preview'}))]){allStates(n);n.states=['focus-visible'];const s=style(n);assert.equal(s.outline,'none');assert.notEqual(s.background,'#c8d4d7');assert.equal(s.fill,undefined,'avatar artwork must not be recolored');}
const file=node('input',{type:'file'},node('dialog',{class:'transfer-dialog'}));file.pseudo='file-selector-button';for(const states of statesList){file.states=states;const s=undecorated(file);assert.equal(s.background,'#c8d4d7');assert.equal(s.border,'0');assert.equal(s.outline,'none');}unchangedByFocus(file);file.pseudo='';unchangedByFocus(file);assert.equal(style(file).outline,'none');
assert.equal(style(byId('tutorialContinue'))['-webkit-text-stroke'],'2px #fff','tutorial white stroke preserved');
assert.equal(style(node('div',{class:'card'},node('dialog',{class:'feature-help'})))['box-shadow'],'0 3px 12px #23392d18','original help card shadow preserved');
assert.equal(style(node('div',{class:'reward-result-card'}))['box-shadow'],'0 8px 28px #152b3533','original reward card shadow preserved');
// Mutation witnesses prove the evaluator catches reintroduced focus styling,
// not only the expected final values.
const regression=byId('closeSettings');regression.states=['focus-visible'];
rules.push(['','button:focus-visible','box-shadow:inset 0 -3px 0 #315b70;text-decoration:underline;']);
const plain=node('button');plain.states=['focus-visible'];assert.throws(()=>undecorated(plain));rules.pop();
title.states=['focus-visible'];rules.push(['','.title-screen:focus-visible .title-tap','text-decoration:underline;']);assert.throws(()=>undecorated(titleTap));rules.pop();title.states=[];regression.states=[];
for(const [selector,declarations,target,focusTarget] of [
 ['button:focus-visible','--button-bg:#b1c6d0;',plain],
 ['button.settings-button:focus-visible','filter:brightness(.78);',node('button',{class:'settings-button'})],
 ['button.modal-close:focus-visible','color:#315b70;',regression],
 ['.title-screen:focus-visible .title-tap','color:#315b70;',titleTap,title],
 ['.map-opponent:focus-visible','opacity:.7;',node('span',{class:'map-marker map-opponent',role:'button'})],
 ['.editor-preview [data-stripe]:focus-visible','filter:brightness(.78);',node('rect',{'data-stripe':'0',role:'button'},node('svg',{class:'editor-preview'}))],
 ['.transfer-dialog input[type=file]:focus-visible','--button-bg:#b1c6d0;',node('input',{type:'file'},node('dialog',{class:'transfer-dialog'}))],
]){rules.push(['',selector,declarations]);assert.throws(()=>unchangedByFocus(target,focusTarget),selector+' mutation must be detected');rules.pop();}
// Pointer feedback stays intact; selected art and text editing are independent
// from keyboard focus. These are deliberate baseline values, not snapshots.
for(const [target,states,expected] of [
 [node('button'),[],{cursor:'pointer',background:'#c8d4d7',color:'#263e48'}],
 [node('button'),['hover'],{filter:'brightness(1.04)'}],
 [node('button'),['active'],{filter:'brightness(.96)'}],
 [node('button'),['disabled','hover'],{filter:'none',cursor:'default',opacity:'.45'}],
 [node('button',{class:'settings-button'}),['hover'],{filter:'none',background:'transparent'}],
 [node('button',{class:'settings-button'}),['active'],{transform:'scale(.94)'}],
 [node('button',{class:'map-page'}),['hover'],{filter:'brightness(1.1)'}],
 [day,['hover'],{filter:'none',background:'transparent'}],
 [swatch,['active'],{filter:'none',background:'#e0b99b'}],
 [download,['hover'],{filter:'brightness(1.04)'}],
 [download,['active'],{filter:'brightness(.96)'}],
 [node('canvas'),[],{cursor:'grab','touch-action':'none'}],
 [node('canvas'),['active'],{cursor:'grabbing'}],
 [node('rect',{'data-stripe':'0'},node('svg',{class:'editor-preview'})),[],{cursor:'pointer'}],
 [node('span',{class:'map-opponent'},node('div',{class:'map-players'})),[],{cursor:'pointer','touch-action':'pan-y'}],
]){target.pseudo='';target.states=states;const actual=style(target);for(const [key,value] of Object.entries(expected))assert.equal(actual[key],value,(target.a.class||target.tag)+' '+states+' '+key);target.states=[];}
const arrow=node('svg',{},node('button',{class:'map-page'}));arrow.parent.states=['active'];assert.equal(style(arrow).transform,'scale(1.1)');
const airship=node('span',{class:'daily-airship-body'},node('button',{class:'daily-airship'}));airship.parent.states=['active'];assert.equal(style(airship).transform,'scale(1.04)');
for(const n of [byId('playerName'),node('input',{type:'number'},node('div',{class:'debug-controls'}))]){n.states=['focus','focus-visible'];assert.equal(style(n).outline,undefined,'Native editing field outline is not suppressed');assert.notEqual(style(n)['font-size'],undefined,'Input readability stays explicit');n.states=[];}
for(const [n,bg] of [[node('div',{class:'card'}),'#f8f6ee'],[byId('settingsDialog'),'#f8f6ee'],[node('div',{class:'stage-heart-items'}),'#eee9df'],[node('div',{class:'feature-help-icon'}),'#eee9df'],[node('canvas',{class:'help-illustration'}),'#eee9df'],[node('div',{class:'stage-start-ranking'}),'#eee9df'],[node('div',{class:'result-ranking'}),'#eee9df'],[node('div',{class:'daily-calendar-plate'}),'#f8f6ee'],[node('div',{class:'daily-stage-start'}),'#f8f6ee']])assert.equal(style(n).background,bg,'unchanged plate '+(n.a.id||n.a.class));
assert(!/#(?:d5aa47|d4a63d|ff9200)\b/i.test(clean),'obsolete orange/gold focus or stage ring remains');
console.log(`PASS static button author cascade: ${controls.length} actual/synthesized controls, contrast ${contrast.toFixed(2)}:1, focus-invariant pointer states/pseudos, artwork, palette, file selector, native text fields and unchanged plates (no browser QA)`);

for(const id of ['stageStartButton','dailyStartButton']){const s=style(byId(id));assert.equal(s['font-size'],'24px');assert.equal(s['font-weight'],'900');assert.equal(s['-webkit-text-stroke'],'2px #fff');assert.equal(s['paint-order'],'stroke fill');assert.equal(s.border,'0','White outline belongs to glyphs, not button border');}
const tip=style(node('p',{},node('aside',{class:'result-tip'},byId('overlay'))));assert.equal(tip['font-size'],'16px');assert.equal(tip['overflow-wrap'],'anywhere');
