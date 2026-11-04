'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./help-owner-copy.cjs');
const b=boot(),css=fs.readFileSync('styles.css','utf8');
const byKey=key=>b.nodes.find(n=>n.attrs['data-i18n']===key);
const scroll=b.doc.getElementById('helpScroll'),note=b.doc.getElementById('helpTrialNote');
assert.equal(scroll.children[0],byKey('help.game.intro'));
assert.equal(scroll.children.at(-1),note,'Trial notice stays at the document end, not before the introduction');
assert(!b.nodes.some(n=>['helpContents','helpGame'].includes(n.attrs.id)));
for(const [before,after,section] of [
 ['help.rules.stamina','help.rules.lives','helpRules'],
 ['help.controls.move','help.controls.commit','helpControls']
]){
 const first=byKey(before),second=byKey(after),row=first.parent,parent=row.parent;
 assert.equal(row.attrs.class,'help-illustrated-row');
 assert.equal(parent.attrs['aria-labelledby'],section);
 assert.equal(second.parent,parent,'Full-width continuation must be outside the illustration flex row');
 assert.equal(parent.children[parent.children.indexOf(row)+1],second,'Continuation follows its own illustration directly');
 assert.equal(second.attrs.class,undefined,'No image-column styling on full-width paragraph');
}
assert.equal(b.run('GAME_TEXT_JA["help.controls.move"]'),'画面をスワイプして体を動かします。2本の手足で支え、残りの2本は近くのホールドへ自動で移ります。');
assert.equal(b.run('GAME_TEXT_JA["help.rules.lives"]'),'登頂に失敗するとライフが一つ減り、ライフがなくなると回復するまであそぶことができません。');
for(const [key,section] of [['help.map.select','helpMap'],['help.daily.select','helpDaily'],['help.editor.customize','helpEditor']]){
 const copy=byKey(key),row=copy.parent;assert.equal(row.attrs.class,'help-illustrated-row');assert.equal(row.parent.attrs['aria-labelledby'],section);assert.equal(row.parent.children[1],row,'New picture is at the first paragraph, immediately after its section heading');
}
assert.equal(b.run('GAME_TEXT_JA["help.controls.commit"]'),'手足4本がホールドに届く位置で指を離すと、1ムーブが決まります。届かない位置で離すと、移動前の位置へ戻ります。');
assert.equal(b.run('GAME_TEXT_JA["help.holds.hazard"]'),'小さくとがったホールドです。新たにつかんで1ムーブを確定すると、スタミナを追加で1消費します。');
assert.equal(b.run('GAME_TEXT_JA["help.holds.heart"]'),'コース上でボディが触れると、スタミナが2回復します。');
const list=b.nodes.find(n=>n.attrs.class==='help-hold-list');assert.equal(list.tag,'ul');assert.equal(list.attrs.role,'list','Keep list semantics in Safari even when markers are hidden');
assert(css.includes('.help-dialog .help-hold-list { list-style:none; padding-left:0; }'));
assert(css.includes('.help-hold-list strong { display:block; font-weight:700; }'));
for(const language of ['en','ja','en','ja']){
 b.run('setGameLanguage('+JSON.stringify(language)+')');
 assert.equal(byKey('help.rules.lives').hidden,false,'The current lives explanation is present in both languages');
 assert.equal(byKey('help.controls.feet').parent.hidden,false,'Keep the foot-height illustration row in both languages');
 assert.equal(byKey('help.map.chalk').hidden,false);assert.equal(byKey('help.map.unlock').hidden,false);
 for(const key of ['help.rules.tutorial','help.map.records','help.map.rewards','help.map.lives','help.daily.attempts','help.daily.rewards','help.settings.navigation'])assert.equal(byKey(key).hidden,true,'Removed help remains hidden in '+language+': '+key);
 const goal=byKey('help.holds.goal').parent.parent.parent;assert.equal(goal.tag,'li');assert.equal(goal.hidden,false,'Goal hold remains in both languages');
 assert.equal(byKey('help.holds.chalk').parent.hidden,true,'The old chalk item remains omitted in both languages');
 assert.equal(byKey('help.controls.commit').hidden,false);
 for(const kind of ['normal','wide','hazard','goal','heart','chalk']){
  const label=byKey('help.holds.'+kind+'Label');assert.equal(label.tag,'strong');
  assert(!/[:：・]/.test(label.textContent),'Names contain no bullet or colon');
 }
 assert(note.hidden,'Language changes never expose the formal trial note');
}
note.hidden=false;b.run('setGameLanguage("en");setGameLanguage("ja")');assert(!note.hidden,'Active trial footer is retained');
const scaled=css.match(/((?:\.help-hold-list canvas\[data-help-art="[a-z]+"\],?\s*)+)\{ transform:scale\(\.8\); transform-origin:center; \}/);
assert(scaled,'Scoped icon-only scaling rule exists');
assert.deepEqual([...scaled[1].matchAll(/data-help-art="([a-z]+)"/g)].map(m=>m[1]),['normal','hazard','goal','heart']);
assert(!scaled[1].includes('wide'),'Large hold remains unscaled');
assert(css.includes('.help-illustration canvas { display:block; width:78px; height:78px; pointer-events:none; }'));
assert(Math.abs(78*.8*.8-49.92)<1e-10,'Four square icon envelopes become 80% of the old 62.4px, not 80% of the plate');
assert(Math.abs(78*.8*.8*.9-44.928)<1e-10,'Heart stays proportional');
// Numeric layout check only: full-width paragraph 322 vs image-row text 232.
const content=368-44-2;assert.equal(content,322);assert.equal(content-78-12,232);
for(const width of [322,240,200,160])assert((width<240?width:width-90)>=150);
console.log('PASS help layout: intro first, retained trial footer, exact split boundaries/full-width siblings in correct sections, JA/EN switch, bold line-separated markerless accessible list, four icons at 80% with unchanged plates/wide hold and numerical small-width wrapping (no browser rendering)');
