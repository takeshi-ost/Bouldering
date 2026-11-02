'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
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
 '登頂に失敗するとライフが一つ減り、ライフがなくなると回復するまであそぶことができません。',
 '画面をスワイプして体を動かします。2本の手足で支え、残りの2本は近くのホールドへ自動で移ります。',
 '手足4本がホールドに届く位置で指を離すと、1ムーブが決まります。届かない位置で離すと、移動前の位置へ戻ります。',
 '足を手より高い位置に置くことはできません。',
 'ボディを短くタップすると、直前の1ムーブだけ元に戻せます。',
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
const digest=blocks=>crypto.createHash('sha256').update(JSON.stringify(blocks)).digest('hex');
function previousEnglishBlocks(blocks){
 const previous=blocks.map(b=>b.replace(/^(Hold|Large Hold|Pointed Hold|Heart|Chalk Bag)\n/,'$1: '));
 previous.splice(4,2,previous[4]+' '+previous[5]);return previous; // Only paragraph/name formatting changed.
}
function test(){
 const b=boot();assert.deepEqual(b.blocks(),expected,'Visible authored JA text/order/punctuation/newlines must match without old extra paragraphs');
 const trial=b.doc.getElementById('helpTrialNote');assert(trial.hidden);
 for(const language of ['en','ja','en','ja']){
  b.run('setGameLanguage('+JSON.stringify(language)+')');assert(trial.hidden,'Changing language must not reveal formal trial note');
  if(language==='ja')assert.deepEqual(b.blocks(),expected);
  else assert.equal(digest(previousEnglishBlocks(b.blocks())),'71e7bfa2d1f48fee5825d687bf6007aa813f8907564f112158090c6de8f54e33','English wording/order must match 0.4.34 after reversing only paragraph/name formatting');
 }
 trial.hidden=false;b.run('setGameLanguage("en");setGameLanguage("ja");');assert.equal(trial.hidden,false,'Changing language must not hide an active trial notice');
 assert.deepEqual(b.blocks(),[...expected,b.run('GAME_TEXT_JA["help.trialNote"]')]);
 const css=read('styles.css');assert(css.includes('.help-scroll p { white-space:pre-line; }'));assert(css.includes('html[lang="ja"] .help-scroll .help-item-gap { margin-top:16px; }'));
 assert.equal(b.run('GAME_TEXT_JA["help.rules.stamina"]'),expected[2]);
 console.log('PASS owner help copy: exact 21 JA body blocks, punctuation/line breaks, omitted old JA details, goal/stamina labels, JA/EN/JA visibility, unchanged English wording after formatting normalization, preserved footer trial-note gate and paragraph spacing (no browser rendering)');
}
if(require.main===module)test();
module.exports={boot,digest};
