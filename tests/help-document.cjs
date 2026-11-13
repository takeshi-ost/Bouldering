'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8');
const help=html.match(/<dialog id="helpDialog"[\s\S]*?<\/dialog>/)[0];
const c=vm.createContext({});vm.runInContext(fs.readFileSync('js/text-ja.js','utf8')+'\n'+fs.readFileSync('js/text-en.js','utf8')+'\nglobalThis.copy={ja:GAME_TEXT_JA,en:GAME_TEXT_EN};',c);
const keys=['rules','controls','holds','map','daily','settings','editor'].map(k=>'help.'+k+'.heading');
const expected=['ルール','そうさ方法','ホールドとアイテム','ステージマップ','デイリーチャレンジ','設定','キャラクターエディット'];
assert.equal(c.copy.ja['ui.showHelp'],'くわしいあそびかた');
assert.equal(c.copy.en['ui.showHelp'],'Detailed Instructions');
const headings=[...help.matchAll(/<(h[34]) id="([^"]+)" data-i18n="([^"]+)"><\/h[34]>/g)];
assert.deepEqual(headings.map(m=>m[3]),keys);assert.deepEqual(headings.map(m=>m[1]),['h3','h3','h3','h3','h3','h3','h4']);
assert.deepEqual(headings.map(m=>c.copy.ja[m[3]]),expected);
assert.deepEqual(headings.map(m=>c.copy.en[m[3]]),['Rules','Controls','Holds and Items','Stage Map','Daily Challenge','Settings','Character Editor']);
assert.equal((help.match(/<section /g)||[]).length,7);assert.equal((help.match(/<hr class="help-divider">/g)||[]).length,7);
assert(!/helpContents|helpGame\"|help-contents/.test(help),'Contents and game heading/wrapper are removed');
assert(/id="helpScroll"[^>]*>\s*<p data-i18n="help.game.intro"><\/p>/.test(help),'Introduction is the first body content');
// Pin semantic parentage and a divider between every adjacent content heading.
const sectionParents=[],stack=[];let sinceLast='';
for(const token of help.matchAll(/<\/?(?:section|h[34])\b[^>]*>|<hr class="help-divider">/g)){
 const t=token[0];if(t.startsWith('<section'))stack.push(t.match(/aria-labelledby="([^"]+)"/)[1]);
 else if(t==='</section>')stack.pop();
 else if(/^<h[34]\b/.test(t)){
  if(sectionParents.length)assert(sinceLast.includes('<hr'),'Each item starts after a divider');
  sectionParents.push([...stack]);sinceLast='';
 }else if(t.startsWith('<hr'))sinceLast+=t;
}
assert.deepEqual(sectionParents,[['helpRules'],['helpControls'],['helpHolds'],['helpMap'],['helpDaily'],['helpSettings'],['helpSettings','helpEditor']]);assert.equal(stack.length,0);
assert(/id="helpScroll"[^>]*data-i18n-aria-label="ui.showHelp"/.test(help));assert(!/tabindex/.test(help),'Help scrolling uses native touch/wheel without a keyboard tab stop');
assert(/id="helpTrialNote"[^>]*hidden[^>]*data-i18n="help.trialNote"/.test(help),'Formal help keeps trial-only note hidden');
for(const language of ['ja','en'])for(const m of help.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g))assert.equal(typeof c.copy[language][m[1]],'string',m[1]);
for(const key of ['ui.restart','ui.mapCourses'])assert(c.copy.en['help.settings.audio'].includes('“'+c.copy.en[key]+'”'),'Help names the actual Settings control: '+key);
assert(c.copy.en['help.editor.customize'].includes('“'+c.copy.en['ui.editorRandom']+'”'));
for(const key of ['ui.editorConfirm','ui.editorCancel'])assert(c.copy.en['help.editor.saveCancel'].includes('“'+c.copy.en[key]+'”'));
assert(c.copy.ja['help.map.chalk'].includes('1個につきスタミナを1'));
assert(c.copy.ja['help.holds.heart'].includes('スタミナが2'));
assert.equal(c.copy.ja['help.daily.attempts'],'');assert.equal(c.copy.ja['help.map.lives'],'');
assert.equal(c.copy.en['help.daily.attempts'],'');assert.equal(c.copy.en['help.map.lives'],'');
assert(c.copy.en['help.map.chalk'].includes('adds 1 stamina per bag'));
assert.equal(c.copy.en['help.holds.heartLabel'],'Stamina +2');assert(c.copy.en['help.holds.heart'].includes('restore 2 stamina'));
assert.equal(c.copy.en['help.daily.select'].split('\n')[1],'No lives are used, and Chalk Bags cannot be used.');
for(const key of Object.keys(c.copy.ja).filter(key=>key.startsWith('help.'))){
 assert.equal(c.copy.en[key]==='',c.copy.ja[key]==='','Omission parity: '+key);
 assert.equal(c.copy.en[key].split('\n').length,c.copy.ja[key].split('\n').length,'Paragraph parity: '+key);
}
assert(c.copy.ja['help.trialNote'].includes('オンラインランキングへの送信とデータの引き継ぎはできません'));
assert(/\.help-scroll\s*\{[^}]*min-height:0;[^}]*overflow-y:auto;[^}]*overscroll-behavior:contain;[^}]*touch-action:pan-y;/.test(css));
assert(/\.help-dialog \.help-heading\s*\{[^}]*flex:0 0 auto;/.test(css));
assert(/\.help-scroll \.help-divider\s*\{[^}]*border-top:1px solid #dce0d4;/.test(css));
assert(css.includes('.help-dialog .help-heading h2 { overflow-wrap:anywhere; }'));
assert(!/<table\b/.test(help),'Help remains a responsive document, not a fixed-width table');
assert.equal((help.match(/data-help-image=/g)||[]).length,14,'Fourteen requested illustrations supplement the complete text');
console.log('PASS detailed help: exact title, intro-first, 7 ordered/nested headings and dividers, no contents, JA/EN bindings and real UI names, matching current items/Daily/lives copy and omissions, trial-only notice, native touch/wheel bounded vertical scroll and wrapping (structural, not browser rendering)');
