'use strict';
const $=id=>document.getElementById(id);
const home=$('home'),play=$('play'),host=$('frameHost'),dialog=$('confirmReset');
const types={straight:'ストレート',meander:'蛇行',branch:'分岐'},lengths={short:'ショート',middle:'ミドル',long:'ロング'};
const descriptions={straight:'ストレート：方向転換を抑えた、上へ進む骨格です。',meander:'蛇行：左右への方向転換を含む骨格です。',branch:'分岐：今回は近い区間で分かれ、合流する寄り道を試します。遠く離れた本線同士をつなぐ設計ではありません。'};
let currentFrame=null,currentConfig=null,lastStatus='',returnFocus='launchLab';
function error(message){$('configError').textContent=message;$('configError').hidden=!message;}
function validateConfig(config){
 if(!config || !Object.hasOwn(types,config.type) || !Object.hasOwn(lengths,config.length))throw Error('骨格と長さを選び直してください。');
 const seed=String(config.seed);
 if(!/^\d{1,10}$/.test(seed) || Number(seed)>4294967295)throw Error('Seed は 0〜4294967295 の整数で入力してください。');
 return {mode:'lab',type:config.type,length:config.length,seed:String(Number(seed)),guide:config.guide===true};
}
function readConfig(){return validateConfig({type:$('skeletonType').value,length:$('courseLength').value,seed:$('seed').value.trim(),guide:$('routeGuide').checked});}
function retainConfig(config){
 if(config.mode!=='lab')return;
 $('skeletonType').value=config.type;$('courseLength').value=config.length;$('seed').value=config.seed;$('routeGuide').checked=config.guide;updateTypeHelp();
}
function configHash(config){
 if(config.mode==='baseline')return '#play';
 const params=new URLSearchParams({type:config.type,length:config.length,seed:config.seed});if(config.guide)params.set('guide','1');return '#lab?'+params;
}
function configFromHash(){
 if(location.hash==='#play')return {mode:'baseline'};
 if(!location.hash.startsWith('#lab?'))return null;
 const p=new URLSearchParams(location.hash.slice(5));
 return validateConfig({type:p.get('type'),length:p.get('length'),seed:p.get('seed'),guide:p.get('guide')==='1'});
}
function destroyGame(){currentFrame=null;host.replaceChildren();if(dialog.open)dialog.close();lastStatus='';}
function startGame(config=currentConfig){
 if(!config)return;
 config=config.mode==='baseline'?{mode:'baseline'}:validateConfig(config);
 destroyGame();currentConfig={...config};retainConfig(config);
 const frame=document.createElement('iframe');currentFrame=frame;
 frame.title=config.mode==='baseline'?'ASCENT 既存方式・オフライン試遊':`ASCENT ${types[config.type]}・骨格の比較試遊`;
 frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.setAttribute('allow','autoplay');frame.referrerPolicy='no-referrer';
 let src='./game/index.html';
 if(config.mode==='lab'){
  const p=new URLSearchParams({lab:'1',type:config.type,length:config.length,seed:config.seed});if(config.guide)p.set('guide','1');src+='?'+p;
 }
 frame.src=src;
 $('frameConfig').textContent=config.mode==='baseline'?'既存方式 0.4.6':`${types[config.type]} / ${lengths[config.length]} / seed ${config.seed}`;
 $('frameStatus').textContent=config.mode==='baseline'?'読み込み中…':'生成・経路検証の結果を待っています…';
 frame.addEventListener('load',()=>{if(currentFrame===frame && !lastStatus)$('frameStatus').textContent=config.mode==='baseline'?'通信なし・この試遊内だけの記録':'生成・経路検証の結果を待っています…';});
 host.append(frame);home.hidden=true;play.hidden=false;document.body.classList.add('playing');error('');
}
function launch(config){const hash=configHash(config);if(location.hash!==hash)history.pushState(null,'',hash);startGame(config);}
function showHome(){destroyGame();home.hidden=false;play.hidden=true;document.body.classList.remove('playing');$(returnFocus).focus();}
function restoreFromHash(){try{const config=configFromHash();if(config){returnFocus=config.mode==='lab'?'launchLab':'launch';startGame(config);}else showHome();}catch(e){showHome();error(e.message);}}
function updateTypeHelp(){$('typeHelp').textContent=descriptions[$('skeletonType').value]||'';}
$('skeletonType').onchange=updateTypeHelp;
$('newSeed').onclick=()=>{
 try{const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);if(String(bytes[0])===$('seed').value)bytes[0]=(bytes[0]+1)>>>0;$('seed').value=String(bytes[0]);error('');}
 catch(_){error('別の seed を取得できませんでした。数値を直接入力してください。');}
};
$('labForm').onsubmit=e=>{e.preventDefault();try{const config=readConfig();returnFocus='launchLab';launch(config);}catch(err){error(err.message);$('seed').focus();}};
$('launch').onclick=()=>{returnFocus='launch';launch({mode:'baseline'});};
$('back').onclick=()=>{history.replaceState(null,'',location.pathname+location.search);showHome();};
$('reset').onclick=()=>{if(!dialog.open)dialog.showModal();};
$('cancelReset').onclick=()=>dialog.close();
$('applyReset').onclick=()=>startGame(currentConfig);
window.addEventListener('message',event=>{
 if(!currentFrame || event.origin!==location.origin || event.source!==currentFrame.contentWindow)return;
 const data=event.data;
 if(!data || data.kind!=='ascent-lab-status' || typeof data.text!=='string')return;
 lastStatus=data.text.slice(0,500);$('frameStatus').textContent=lastStatus;
});
window.addEventListener('popstate',restoreFromHash);
window.addEventListener('pagehide',destroyGame);
window.addEventListener('pageshow',e=>{if(e.persisted)restoreFromHash();});
if(location.hash)restoreFromHash();
