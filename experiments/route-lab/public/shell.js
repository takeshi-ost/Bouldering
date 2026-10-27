'use strict';
const home=document.getElementById('home'),play=document.getElementById('play'),host=document.getElementById('frameHost'),dialog=document.getElementById('confirmReset');
function destroyGame(){host.replaceChildren();dialog.close();}
function startGame(){
 destroyGame();const frame=document.createElement('iframe');
 frame.title='ASCENT 既存方式・オフライン試遊';frame.setAttribute('sandbox','allow-scripts allow-same-origin');
 frame.setAttribute('allow','autoplay');frame.referrerPolicy='no-referrer';frame.src='./game/index.html';host.append(frame);
 document.getElementById('frameStatus').textContent='読み込み中…';
 frame.addEventListener('load',()=>{document.getElementById('frameStatus').textContent='既存方式 0.4.6・通信なし';});
 home.hidden=true;play.hidden=false;document.body.classList.add('playing');
}
function showHome(){destroyGame();home.hidden=false;play.hidden=true;document.body.classList.remove('playing');document.getElementById('launch').focus();}
document.getElementById('launch').onclick=()=>{if(location.hash!=='#play')history.pushState(null,'','#play');startGame();};
document.getElementById('back').onclick=()=>{history.replaceState(null,'',location.pathname+location.search);showHome();};
document.getElementById('reset').onclick=()=>{if(!dialog.open)dialog.showModal();};
document.getElementById('cancelReset').onclick=()=>dialog.close();
document.getElementById('applyReset').onclick=startGame;
window.addEventListener('popstate',()=>location.hash==='#play'?startGame():showHome());
window.addEventListener('pagehide',destroyGame);
window.addEventListener('pageshow',e=>{if(e.persisted)location.hash==='#play'?startGame():showHome();});
if(location.hash==='#play')startGame();
