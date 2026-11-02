'use strict';
// Static author-style + conservative numeric layout checks, not browser QA.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const css=fs.readFileSync('styles.css','utf8').replace(/\/\*[\s\S]*?\*\//g,''),html=fs.readFileSync('index.html','utf8');
const rule=selector=>[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].trim()===selector).map(m=>m[2]).join(';');
const props=selector=>Object.fromEntries(rule(selector).split(';').filter(x=>x.includes(':')).map(x=>{const n=x.indexOf(':');return [x.slice(0,n).trim(),x.slice(n+1).trim()];}));
const dialog=props('.feature-help'),card=props('.feature-help .card'),plate=props('.feature-help-icon'),body=props('.feature-help .card p'),title=props('.feature-help .card h1'),tap=props('.feature-help .modal-tap');
assert.equal(title['text-align'],'center');assert.equal(card['text-align'],'left','Only the heading changes alignment');
assert.equal(card['grid-template-columns'],'78px minmax(0,1fr)');assert.equal(card['min-width'],'0');
assert.equal(plate.width,'78px');assert.equal(plate.height,'78px');assert.equal(plate.padding,'0');assert.equal(plate['box-sizing'],undefined);
assert.match(rule('*'),/box-sizing:\s*border-box/);
assert.equal(plate.background,props('.stage-heart-items').background);assert.equal(plate.background,props('.result-ranking,.stage-start-ranking').background);
assert.equal(plate['grid-column'],'1');assert.equal(plate['grid-row'],'2');assert.equal(body['grid-column'],'2');assert.equal(body['grid-row'],'2');
assert.equal(title['grid-column'],'1 / -1');assert.equal(title['grid-row'],'1');assert.equal(tap['grid-column'],'1 / -1');assert.equal(tap['grid-row'],'3');
for(const p of [title,body]){assert.equal(p['min-width'],'0');assert.equal(p['overflow-wrap'],'anywhere');}
assert.equal(dialog.overflow,'auto');assert.equal(dialog['align-items'],'start');assert.equal(card.margin,'auto','Oversized cards must start at the scroll origin, not center above it');
assert.equal(plate.display,'grid');assert.equal(plate['place-items'],'center');assert.equal(plate.overflow,'hidden');
for(const selector of ['.feature-help-icon canvas','.feature-help-icon .course-heart-icon']){
 const p=props(selector);assert.equal(p.width,'62.4px');assert.equal(p.height,'62.4px');
}
assert(Math.abs(parseFloat(plate.width)*.8-62.4)<1e-9,'Existing icons keep the previous 80% ratio');
assert.equal(props('.tutorial-dialog .feature-help-icon img').width,'100%');assert.equal(props('.tutorial-dialog .feature-help-icon img').height,'100%');
assert.equal(props('.tutorial-dialog .feature-help-icon img[hidden]').display,'none');
assert.equal(props('.feature-help-icon .course-heart-icon[hidden]').display,'none','Author display:block must not reveal a failed/late image');
assert.equal(props('.feature-help.explanation-image-loading .card').visibility,'hidden');
const tutorial=html.match(/id="tutorialContent"[\s\S]*?<\/div>\s*<\/dialog>/)?.[0];assert(tutorial);
assert(tutorial.indexOf('id="tutorialTitle"')<tutorial.indexOf('id="tutorialImageSlot"'));
assert(tutorial.indexOf('id="tutorialImageSlot"')<tutorial.indexOf('id="tutorialText"'));
assert(/id="tutorialImage"[^>]*hidden/.test(tutorial));assert(!/id="tutorialImage"[^>]*src=/.test(tutorial));
const context={document:{},globalThis:{}};vm.runInNewContext(fs.readFileSync('js/viewport.js','utf8'),context);
for(const lang of ['ja','en'])vm.runInNewContext(fs.readFileSync('js/text-'+lang+'.js','utf8')+';globalThis.copy_'+lang+'=GAME_TEXT_'+lang.toUpperCase()+';',context);
const cases=[[280,568,{}],[320,568,{}],[390,844,{top:47,bottom:34}],[430,932,{top:59,bottom:34}],[844,390,{left:47,right:47,bottom:21}],[390,300,{top:47}],[1366,768,{}]];
const bodies=['tutorial.intro.welcome','tutorial.intro.movement','tutorial.intro.goal','tutorial.wide','tutorial.goal.fixed','tutorial.goal.finish','feature.heart','feature.hazard'];
let layouts=0,scrollCases=0;
for(const [w,h,insets] of cases){
 const f=context.viewportMetrics(w,h,insets),outerPad=parseFloat(dialog.padding),cardPad=parseFloat(card.padding),border=1;
 const width=Math.min(parseFloat(card['max-width']),f.width-2*outerPad),inner=width-2*(cardPad+border),gap=parseFloat(card['column-gap']);
 const imageWidth=parseFloat(plate.width),textWidth=inner-imageWidth-gap;
 assert(textWidth>0);assert.equal(imageWidth,78);assert.equal(imageWidth-2*parseFloat(plate.padding),78);
 const left=(f.width-width)/2+cardPad+border,textLeft=left+imageWidth+gap;
 assert(textLeft>=left+imageWidth+gap);assert(textLeft+textWidth<=f.width-outerPad);
 assert(f.left+textLeft*f.scale>=f.left+(left+imageWidth)*f.scale,'Columns cannot overlap after scaling');
 for(const locale of ['ja','en'])for(const scale of [1,1.5,2,3])for(const key of bodies){
  const copy=context.globalThis['copy_'+locale],font=parseFloat(body['font-size'])*scale;
  // Deliberately count every character as a full em, including Latin letters.
  // anywhere wrapping bounds even a long unbroken string to its own column.
  const rows=Math.ceil([...copy[key]].length/Math.max(1,Math.floor(textWidth/font)));
  const bodyHeight=rows*font*parseFloat(body['line-height']),row2=Math.max(imageWidth,bodyHeight);
  const titleFont=parseFloat(title['font-size'])*scale,titleRows=Math.ceil([...copy['tutorial.title.play']].length/Math.floor(inner/titleFont));
  const row1=titleRows*titleFont*parseFloat(title['line-height']),row3=Math.max(44,26*scale+8);
  const height=2*(cardPad+border)+row1+row2+row3+2*parseFloat(card['row-gap'])+4;
  const top=outerPad+Math.max(0,(f.height-2*outerPad-height)/2),row2Top=top+cardPad+border+row1+parseFloat(card['row-gap']);
  const row3Top=row2Top+row2+parseFloat(card['row-gap'])+4;
  assert(row3Top>=row2Top+Math.max(imageWidth,bodyHeight));assert(top>=outerPad);
  if(height>f.height-2*outerPad){scrollCases++;assert.equal(top,outerPad);assert.equal(dialog.overflow,'auto');}
  layouts++;
 }
}
assert(scrollCases>0,'Exercise overflow/large-text access, not just fitting content');
console.log(`PASS illustration plates: 78×78/62.4px artwork, existing color/icons, title/body/TAP grid, reserved tutorial slot; ${layouts} conservative layouts including ${scrollCases} scroll cases across 7 safe viewports and 4 text scales (static/numeric, no browser QA)`);
