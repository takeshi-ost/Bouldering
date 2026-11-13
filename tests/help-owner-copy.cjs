'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
function helpDocument(html){
 const help=html.match(/<dialog id="helpDialog"[\s\S]*?<\/dialog>/)[0],nodes=[],stack=[];
 for(const token of help.matchAll(/<[^>]+>|[^<]+/g)){
  const value=token[0];if(!value.startsWith('<'))continue;
  if(value.startsWith('</')){stack.pop();continue;}
  const tag=value.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
  const attrs=Object.fromEntries([...value.matchAll(/\s([\w-]+)(?:="([^"]*)")?/g)].map(m=>[m[1],m[2]??'']));
  const node={tag,attrs,children:[],parent:stack.at(-1),hidden:Object.hasOwn(attrs,'hidden'),getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;}};
  node.parent?.children.push(node);nodes.push(node);if(!['hr','img','br','input'].includes(tag))stack.push(node);
 }
 const doc={documentElement:{},querySelectorAll(selector){const key=selector.slice(1,-1);return nodes.filter(n=>Object.hasOwn(n.attrs,key));},getElementById(id){return nodes.find(n=>n.attrs.id===id);}};
 const visible=n=>!n.hidden&&(!n.parent||visible(n.parent));
 const text=n=>(n.textContent??n.children.filter(visible).map(text).join(''))+(n.tag==='strong'&&/Label$/.test(n.attrs['data-i18n']||'')?'\n':'');
 const inHolds=n=>n&& (n.attrs['aria-labelledby']==='helpHolds'||inHolds(n.parent));
 return {doc,nodes,blocks:()=>nodes.filter(n=>visible(n)&&(n.tag==='p'||n.tag==='li'&&inHolds(n))).map(text)};
}
function boot(html=read('index.html'),ja=read('js/text-ja.js'),en=read('js/text-en.js'),text=read('js/text.js')){
 const document=helpDocument(html),context=vm.createContext({document:document.doc});
 vm.runInContext(ja+'\n'+en+'\n'+text,context);
 return {...document,run:code=>vm.runInContext(code,context)};
}
const expected=[
 'ASCENTは、クライマーを動かしてゴールを目指すボルダリングゲームです。ホールドを選びながら、少ないムーブで登ってみましょう。',
 '手足4本がホールドに固定された状態で、黄色いゴールを両手でつかむとクリアです。',
 '1ムーブごとにスタミナを消費し、0になる前にゴールできれば登頂成功です。',
 'ステージマップでは、登頂に失敗するとライフが一つ減り、ライフがなくなると回復するまであそぶことができません。',
 '画面をスワイプして体を動かします。2本の手足で支え、残りの2本は近くのホールドへ自動で移ります。',
 '手足4本がホールドに届く位置で指を離すと、1ムーブが決まります。届かない位置で離すと、移動前の位置へ戻ります。',
 '足を手より高い位置に置くことはできません。',
 'ボディを短くタップすると、直前の1ムーブだけ元に戻せます。',
 'そうさ中に別のゆびでタッチすると、うごきをキャンセルできます',
 '2本指スワイプ、または画面の左右端をスワイプすると、壁を上下にスクロールできます。',
 'ホールド\n手足を1本置くことができます。',
 '大きなホールド\n両手または両足を置くことができます。手と足を一緒に置くことはできません。',
 '尖ホールド\n小さくとがったホールドです。新たにつかんで1ムーブを確定すると、スタミナを追加で1消費します。',
 'ゴールホールド\nゴールを両手でつかむと登頂成功です。',
 'スタミナ+2\nコース上でボディが触れると、スタミナが2回復します。',
 'マップに並んだステージを順番にクリアするモードです。',
 '開始前の画面でチョークバッグの使用量を増やすと1個につきスタミナを1追加できます。使った分は消費され、やり直しには持ち越しません。',
 'クリアすると次が開き、クリア済みのステージは何度でも遊べます。',
 'マップの飛行船からカレンダーを開き、その日のお題にチャレンジします。\nライフは消費せず、チョークバッグも使えません。',
 '右上の歯車アイコンから開きます。音楽と効果音のオン・オフと音量、使う言語が変えられます。\n使う場所によって「リタイヤ」や「タイトルに戻る」などが選べます。',
 'マップとデイリーの設定から開き、プレイヤー名と配色を変えられます。スライダーでボディを1〜8段に分け、頭や各段をタップして色を選びます。「おまかせ」で配色と段数をランダムに変更できます。',
 'プレイヤー名は10文字まで入力できます。「決定」で保存し、「戻る」で変更を取り消します。見た目を変えても、登る力やスタミナは変わりません。'
];
// Independently reviewed English rendering of the same current Japanese blocks.
// Keep this literal fixture separate from the catalog so copy/order drift fails.
const expectedEnglish=[
 'ASCENT is a bouldering game where you guide a climber to the goal. Choose your holds and try to reach the top in fewer moves.',
 'Grab the yellow goal with both hands while all four limbs are fixed on holds to clear the stage.',
 'Each move uses stamina. Reach the goal before it drops to 0 to complete the climb.',
 'On the Stage Map, failing a climb costs one life. If you run out of lives, you cannot play until they recover.',
 'Swipe the screen to move your body. Two limbs support you while the other two automatically move to nearby holds.',
 'Release where all four limbs can reach holds to complete one move. Release where they cannot reach, and you return to your previous position.',
 'Your feet cannot be placed higher than your hands.',
 'Tap your body briefly to undo only your last move.',
 'While moving, touch the screen with another finger to cancel the move.',
 'Swipe with two fingers, or along the left or right edge of the screen, to scroll the wall up and down.',
 'Hold\nSupports one hand or foot.',
 'Large Hold\nCan support both hands or both feet. A hand and a foot cannot share it.',
 'Pointed Hold\nA small pointed hold. Completing a move with a new grip on it costs 1 extra stamina.',
 'Goal Hold\nGrab the goal with both hands to reach the summit.',
 'Stamina +2\nTouch it with your body on the course to restore 2 stamina.',
 'In this mode, clear the stages on the map in order.',
 'On the screen before a stage starts, increasing the number of Chalk Bags used adds 1 stamina per bag. Used bags are consumed, and their bonus does not carry over to a retry.',
 'Clearing a stage unlocks the next one, and cleared stages can be replayed as often as you like.',
 'Open the calendar from the airship on the map and take on the challenge for that day.\nNo lives are used, and Chalk Bags cannot be used.',
 'Open Settings with the gear icon at the top right. You can turn music and sound effects on or off, adjust their volume, and change the language.\nDepending on where you open Settings, options such as “Give Up” and “Title Screen” are available.',
 'Open it from the map or Daily settings to change your name and colors. Use the slider to divide the body into 1–8 sections, then tap the head or a section to choose its color. “Randomize” changes the colors and number of sections at random.',
 'Your name can contain up to 10 characters. Select “Confirm” to save, or “Back” to discard your changes. Appearance does not change your climbing ability or stamina.'
];
const omittedKeys=['help.rules.tutorial','help.holds.chalkLabel','help.holds.chalk','help.map.records','help.map.rewards','help.map.lives','help.daily.attempts','help.daily.rewards','help.settings.navigation'];
function test(){
 const b=boot();assert.deepEqual(b.blocks(),expected,'Visible authored JA text/order/punctuation/newlines must match without old extra paragraphs');
 const trial=b.doc.getElementById('helpTrialNote');assert(trial.hidden);
 assert.equal(expected.length,22);assert.equal(expectedEnglish.length,22);
 for(const catalog of ['GAME_TEXT_JA','GAME_TEXT_EN']){
  const empty=Array.from(b.run('Object.keys('+catalog+').filter(key=>key.startsWith("help.") && '+catalog+'[key]==="")'));
  assert.deepEqual(empty.sort(),[...omittedKeys].sort(),'Current omitted help blocks must match in '+catalog);
 }
 for(const language of ['en','ja','en','ja']){
  b.run('setGameLanguage('+JSON.stringify(language)+')');assert(trial.hidden,'Changing language must not reveal formal trial note');
  assert.deepEqual(b.blocks(),language==='ja'?expected:expectedEnglish,'Exact current '+language+' wording, order, punctuation and paragraph boundaries');
  assert.equal(b.doc.documentElement.lang,language);
  if(language==='en')assert(b.blocks().every(block=>!/[\u3040-\u30ff\u3400-\u9fff]/.test(block)),'English help contains no Japanese prose');
 }
 trial.hidden=false;b.run('setGameLanguage("en");');assert.equal(trial.hidden,false,'Changing language must not hide an active trial notice');
 assert.deepEqual(b.blocks(),[...expectedEnglish,'This trial is offline. Records are saved in this browser separately from the regular game. Online ranking submissions and data transfers are disabled. Ads use a test screen.']);
 b.run('setGameLanguage("ja");');assert.equal(trial.hidden,false);
 assert.deepEqual(b.blocks(),[...expected,b.run('GAME_TEXT_JA["help.trialNote"]')]);
 const css=read('styles.css');assert(css.includes('.help-scroll p { white-space:pre-line; }'));assert(css.includes('html[lang="ja"] .help-scroll .help-item-gap { margin-top:16px; }'));
 assert.equal(b.run('GAME_TEXT_JA["help.rules.stamina"]'),expected[2]);
 console.log('PASS owner help copy: exact independent 22-block JA/EN fixtures, punctuation/line breaks/order, matching nine omitted entries, goal/stamina labels, repeated locale switches, no extra English rules, preserved footer trial-note gate and paragraph spacing (no browser rendering)');
}
if(require.main===module)test();
module.exports={boot};
