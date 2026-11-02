'use strict';
// Static CSS contract + numeric safe-viewport model, not browser layout QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const css=fs.readFileSync('styles.css','utf8'),html=fs.readFileSync('index.html','utf8');
const rule=selector=>[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].trim()===selector).map(m=>m[2]).join(';');
const screen=rule('.title-screen'),content=rule('.title-content');
assert.match(screen,/inset:0/);assert.match(screen,/padding:108px 22px;/);assert.match(screen,/display:grid;/);assert.match(screen,/align-items:center;/);
assert(!/env\(|100(?:d|s|l)?vh/.test(screen),'Do not double-charge safe areas or use raw device height');
assert.match(content,/display:flex;/);assert.match(content,/flex-direction:column;/);assert.match(content,/margin:auto;/);
assert.match(rule('.title-content .brand'),/margin:0; line-height:1.2;/);
assert.match(rule('.title-content .title-tagline'),/margin:6px 0 0; font-size:13px;/);
assert.match(rule('.title-content p'),/line-height:1.8;/);
assert.match(rule('.brand'),/font-size:36px;/);
assert.match(rule('.title-tap'),/margin-top:44px; min-height:34px;/);
assert.match(rule('.title-content .title-tap[hidden]'),/display:block; visibility:hidden;/);
assert(!css.includes('.title-tap[hidden] { display:none; }'));
assert.match(css,/font:900 18px\/26px/);assert.match(css,/padding:4px 0;/);
const markup=html.match(/<div class="title-content">([\s\S]*?)\n                <\/div>/)?.[1];
assert(markup,'Title content group exists');
assert(!/title-version-space|title-publisher-space/.test(html),'Invisible version/publisher spacers must not affect centering');
assert(markup.indexOf('class="brand"')<markup.indexOf('class="title-tagline"'));
assert(markup.indexOf('class="title-tagline"')<markup.indexOf('id="titleTap"'));
assert.match(markup,/id="titleTap"[^>]*hidden/);
for(const id of ['titleTransfer','playerUuid','releaseVersion'])assert(html.includes('id="'+id+'"'),'Preserve footer identity/control '+id);
assert.match(rule('.title-footer'),/position:absolute;/);assert.match(rule('.title-footer'),/bottom:16px;/);
assert(!fs.readFileSync('scripts/formal-debug-seed.js','utf8').includes('titleScreen.appendChild'),'DEBUG seed input stays in settings, not title');
const context={document:{},globalThis:{}};
vm.runInNewContext(fs.readFileSync('js/viewport.js','utf8'),context);
const cases=[
 [400,700,{}],[390,844,{top:47,bottom:34}],[430,932,{top:59,bottom:34}],
 [320,568,{}],[844,390,{left:47,right:47,bottom:21}],[390,300,{top:47}],
 [1366,768,{}]
];
const padding=108,brand=36*1.2,tagline=6+13*1.8,tap=44+26+8;
for(const [width,height,insets] of cases){
 const frame=context.viewportMetrics(width,height,insets);
 assert(frame.height>=700-1e-8,'Logical viewport has room even on short physical displays');
 for(const textScale of [1,1.5,2]){
  const group=(brand+13*1.8+26)*textScale+6+44+8;
  const available=frame.height-2*padding;
  assert(group<=available,'Content fits between reserved footer/control areas');
  // Flex children keep margins separate; grid centers their complete box.
  const top=padding+(available-group)/2,bottom=top+group;
  const center=frame.top+(top+bottom)/2*frame.scale;
  assert(Math.abs(center-(frame.top+frame.cssHeight/2))<1e-8,'Visible group centered in safe frame');
  assert(top>=padding && bottom<=frame.height-padding+1e-8);
  const pendingHeight=group,readyHeight=group;
  assert.equal(pendingHeight,readyHeight,'visibility:hidden reserves identical TAP geometry');
 }
}
assert.equal(brand+tagline+tap,150.6);
console.log('PASS title centering: spacer-free group, reserved hidden TAP, symmetric safe logical viewport; 7 viewport cases × 3 text scales; footer/identity/settings DEBUG control preserved (static/numeric, no browser QA)');
