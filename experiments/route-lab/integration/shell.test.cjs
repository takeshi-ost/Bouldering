'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../public/shell.js'),'utf8');
function fixture(initialHash=''){
 const items={},handlers={},frames=[];
 function element(id){return items[id]??={value:({skeletonType:'straight',courseLength:'short',seed:'42'})[id]||'',checked:false,hidden:false,open:false,textContent:'',children:[],classList:{add(){},remove(){}},focus(){this.focused=true},showModal(){this.open=true},close(){this.open=false},replaceChildren(){this.children=[]},append(x){this.children.push(x)},setAttribute(k,v){this[k]=v},addEventListener(k,fn){this[k]=fn}};}
 const location={origin:'https://lab.example',hash:initialHash,pathname:'/',search:''};
 const history={pushState(_a,_b,value){location.hash=value.includes('#')?value.slice(value.indexOf('#')):''},replaceState(a,b,value){this.pushState(a,b,value)}};
 const context=vm.createContext({document:{getElementById:element,body:element('body'),createElement(){const frame=element('frame'+frames.length);frame.contentWindow={};frames.push(frame);return frame}},location,history,window:{addEventListener(name,fn){handlers[name]=fn}},URLSearchParams,Uint32Array,crypto:require('node:crypto').webcrypto});
 vm.runInContext(source,context);
 return {element,handlers,frames,location,submit(){element('labForm').onsubmit({preventDefault(){}})}};
}
test('shell preserves skeleton config through reset, comparison, history and reload; baseline stays available',()=>{
 const f=fixture(),$=f.element;
 f.submit();assert.match(f.frames.at(-1).src,/lab=1&type=straight&length=short&seed=42$/);assert.equal($('play').hidden,false);assert.equal(f.location.hash,'#lab?type=straight&length=short&seed=42');
 assert.equal(f.frames.at(-1).sandbox,'allow-scripts allow-same-origin');
 const initial=f.frames.at(-1);
 $('reset').onclick();assert($('confirmReset').open);$('cancelReset').onclick();assert(!$('confirmReset').open);assert.equal(f.frames.length,1);assert.equal($('frameHost').children[0],initial);
 $('reset').onclick();$('applyReset').onclick();assert.equal(f.frames.at(-1).src,initial.src);assert.equal(f.frames.length,2);assert.notEqual(f.frames.at(-1),initial);assert(!$('confirmReset').open);
 $('back').onclick();assert.equal($('home').hidden,false);assert.equal($('frameHost').children.length,0);assert.equal($('seed').value,'42');
 $('skeletonType').value='branch';$('courseLength').value='long';$('routeGuide').checked=true;f.submit();assert.match(f.frames.at(-1).src,/type=branch&length=long&seed=42&guide=1$/);
 const savedHash=f.location.hash;
 // popstate is also the handler used for browser back and forward.
 f.location.hash='';f.handlers.popstate();assert.equal($('home').hidden,false);assert.equal($('frameHost').children.length,0);
 f.location.hash=savedHash;f.handlers.popstate();assert.equal($('play').hidden,false);assert.match(f.frames.at(-1).src,/type=branch&length=long&seed=42&guide=1$/);
 const reloaded=fixture(savedHash);assert.match(reloaded.frames.at(-1).src,/type=branch&length=long&seed=42&guide=1$/);assert.equal(reloaded.element('seed').value,'42');
 $('back').onclick();$('launch').onclick();assert.equal(f.frames.at(-1).src,'./game/index.html');assert.equal(f.location.hash,'#play');
 const baselineReload=fixture('#play');assert.equal(baselineReload.frames.at(-1).src,'./game/index.html');
 f.handlers.pagehide();assert.equal($('frameHost').children.length,0);f.handlers.pageshow({persisted:true});assert.equal(f.frames.at(-1).src,'./game/index.html');
});
test('shell rejects invalid seed and hash rather than substituting a skeleton',()=>{
 const f=fixture(),$=f.element;
 for(const seed of ['4294967296','1e3','-1','1.2','', '12345678901']){
  $('seed').value=seed;const before=f.frames.length;f.submit();assert.equal(f.frames.length,before,seed);assert(!$('configError').hidden,seed);
 }
 for(const seed of ['0','4294967295']){
  $('seed').value=seed;f.submit();assert(f.frames.at(-1).src.includes('seed='+seed));$('back').onclick();
 }
 for(const hash of ['#lab?type=unknown&length=short&seed=42','#lab?type=straight&length=bad&seed=42','#lab?type=straight&length=short&seed=NaN','#lab?type=straight&length=short']){
  const invalid=fixture(hash);assert.equal(invalid.frames.length,0);assert.equal(invalid.element('home').hidden,false);assert(!invalid.element('configError').hidden);
 }
 $('seed').value='42';$('newSeed').onclick();assert(/^\d+$/.test($('seed').value));assert(Number($('seed').value)<=4294967295);assert.notEqual($('seed').value,'42');assert($('configError').hidden);
});
test('shell only accepts status from current same-origin iframe and never replaces text with HTML',()=>{
 const f=fixture(),$=f.element;f.submit();const first=f.frames.at(-1);
 const send=(changes={})=>f.handlers.message({origin:f.location.origin,source:first.contentWindow,data:{kind:'ascent-lab-status',text:'経路検証済み'},...changes});
 send();assert.equal($('frameStatus').textContent,'経路検証済み');first.load();assert.equal($('frameStatus').textContent,'経路検証済み');
 send({origin:'https://other.example'});send({source:{}});send({data:{kind:'other',text:'wrong'}});send({data:{kind:'ascent-lab-status',text:{}}});assert.equal($('frameStatus').textContent,'経路検証済み');
 send({data:{kind:'ascent-lab-status',text:'<img onerror=bad>'+'.'.repeat(600)}});assert.equal($('frameStatus').textContent.length,500);assert($('frameStatus').textContent.startsWith('<img onerror=bad>'));
 $('applyReset').onclick();const waiting=$('frameStatus').textContent;send();assert.equal($('frameStatus').textContent,waiting);
 $('back').onclick();send();assert.equal($('frameHost').children.length,0);
});
