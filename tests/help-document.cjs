'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8');
const help=html.match(/<dialog id="helpDialog"[\s\S]*?<\/dialog>/)[0];
const c=vm.createContext({});vm.runInContext(fs.readFileSync('js/text-ja.js','utf8')+'\n'+fs.readFileSync('js/text-en.js','utf8')+'\nglobalThis.copy={ja:GAME_TEXT_JA,en:GAME_TEXT_EN};',c);
const keys=['rules','controls','holds','map','daily','settings','editor'].map(k=>'help.'+k+'.heading');
const expected=['ルール','そうさ方法','ホールドとアイテム','ステージマップ','デイリーチャレンジ','設定','キャラクターエディット'];
assert.equal(c.copy.ja['ui.showHelp'],'くわしいあそびかた');
const headings=[...help.matchAll(/<(h[34]) id="([^"]+)" data-i18n="([^"]+)"><\/h[34]>/g)];
assert.deepEqual(headings.map(m=>m[3]),keys);assert.deepEqual(headings.map(m=>m[1]),['h3','h3','h3','h3','h3','h3','h4']);
assert.deepEqual(headings.map(m=>c.copy.ja[m[3]]),expected);
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
assert(c.copy.en['help.settings.navigation'].includes(c.copy.en['ui.restart']),'Help names the actual Give Up control');
assert(c.copy.ja['help.map.chalk'].includes('1個につきスタミナを1'));
assert(c.copy.ja['help.holds.heart'].includes('スタミナが2'));
assert.equal(c.copy.ja['help.daily.attempts'],'');assert.equal(c.copy.ja['help.map.lives'],'');
assert(c.copy.en['help.daily.attempts'].includes('cannot play it again once cleared'));
assert(c.copy.en['help.map.lives'].includes('up to 3 naturally'));
assert(c.copy.ja['help.trialNote'].includes('オンラインランキングへの送信とデータの引き継ぎはできません'));
assert(/\.help-scroll\s*\{[^}]*min-height:0;[^}]*overflow-y:auto;[^}]*overscroll-behavior:contain;[^}]*touch-action:pan-y;/.test(css));
assert(/\.help-dialog \.help-heading\s*\{[^}]*flex:0 0 auto;/.test(css));
assert(/\.help-scroll \.help-divider\s*\{[^}]*border-top:1px solid #dce0d4;/.test(css));
assert(css.includes('.help-dialog .help-heading h2 { overflow-wrap:anywhere; }'));
assert(!/<table\b/.test(help),'Help remains a responsive document, not a fixed-width table');
assert.equal((help.match(/data-help-image=/g)||[]).length,13,'Thirteen requested illustrations supplement the complete text');
console.log('PASS detailed help: exact title, intro-first, 7 ordered/nested headings and dividers, no contents, JA/EN bindings and real UI names, distinct items/Daily/life limits, trial-only notice, native touch/wheel bounded vertical scroll and wrapping (structural, not browser rendering)');
