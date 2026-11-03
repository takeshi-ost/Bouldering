'use strict';
// Focused static cascade test, not a browser/rendering claim. These selectors
// are the actual author rules that can match the tutorial TAP and its ancestors.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'js/tutorial.js'),'utf8');
const node=(tag,classes=[],parent=null,pseudo=[])=>({tag,classes,parent,pseudo});
function matchesPart(part,element){
 if(!element || /[^\w.:-]/.test(part))return false;
 const tag=part.match(/^[\w-]+/)?.[0];if(tag && tag!==element.tag)return false;
 for(const name of part.matchAll(/\.([\w-]+)/g))if(!element.classes.includes(name[1]))return false;
 for(const name of part.matchAll(/:([\w-]+)/g))if(!element.pseudo.includes(name[1]))return false;
 return true;
}
function matches(selector,element){
 const parts=selector.trim().split(/\s+/);if(!matchesPart(parts.pop(),element))return false;
 let ancestor=element.parent;
 while(parts.length){const part=parts.pop();while(ancestor&&!matchesPart(part,ancestor))ancestor=ancestor.parent;if(!ancestor)return false;ancestor=ancestor.parent;}
 return true;
}
function style(element,stylesheet=css){
 const result={},priority={};let order=0;
 for(const rule of stylesheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  for(const selector of rule[1].trim().split(',')){
   if(!matches(selector,element))continue;
   const specificity=(selector.match(/[.:][\w-]+/g)||[]).length*100+(selector.match(/(?:^|\s)[a-z][\w-]*/g)||[]).length;
   for(const declaration of rule[2].split(';')){
    const colon=declaration.indexOf(':');if(colon<0)continue;
    const key=declaration.slice(0,colon).trim(),value=declaration.slice(colon+1).trim(),rank=specificity*10000+order;
    if(priority[key]===undefined||rank>=priority[key]){result[key]=value;priority[key]=rank;}
   }
  }
  order++;
 }
 return result;
}
const dialog=node('dialog',['overlay','feature-help','tutorial-dialog']);
const card=node('div',['card'],dialog,['focus','focus-visible']);
const tap=node('button',['modal-tap'],card);
const resting=style(tap);tap.pseudo=['focus','focus-visible'];const keyboard=style(tap);
assert.equal(resting.border,'0');assert.equal(resting['box-shadow'],'none');assert.equal(resting.background,'transparent');
assert.equal(resting['border-radius'],'0');assert.equal(resting['min-height'],'44px');assert.equal(resting['grid-column'],'1 / -1');
assert.equal(resting.font,'900 18px/26px system-ui,-apple-system,sans-serif');assert.equal(resting['letter-spacing'],'.18em');
assert.equal(keyboard.outline,'none');assert.equal(keyboard['text-decoration'],'none');assert.equal(keyboard['text-shadow'],'none');assert.equal(keyboard.color,resting.color);
assert.equal(style(card).outline,'none');
// Browser focus must not change touch/mouse control appearance.
const regular=style(node('button',[],node('dialog',['settings-dialog']),['focus-visible']));
assert.equal(regular.outline,'none');assert.equal(regular['box-shadow'],'none');assert.equal(regular['text-decoration'],'none');assert.equal(regular['--button-bg'],undefined);
const oldRule='.tutorial-dialog button.modal-tap:focus-visible { outline:2px solid #39785b; outline-offset:2px; }';
assert.equal(style(tap,css+oldRule).outline,'2px solid #39785b','regression fixture reproduces the original higher-specificity rectangle');
assert(!/<[^>]*id="tutorialContent"[^>]*(?:tabindex|autofocus)/.test(html));
const button=html.match(/<button\b[^>]*id="tutorialContinue"[^>]*>/)?.[0];assert(button);assert(!/tabindex="-1"/.test(button));
assert(!source.includes("document.getElementById('tutorialContent').focus()"));
assert(!source.includes("document.getElementById('tutorialContinue').focus()"));
console.log('PASS tutorial TAP author cascade: no border/shadow/rectangular focus; shared typography/grid and 44px hit area; no focus-only recoloring or reading-card autofocus (static, no browser QA)');
