'use strict';
// Artifact-only UI. Runtime owns validation, persistence and course identity.
(() => {
 const get=name=>document.getElementById('pagesTrialSeed'+name);
 const dialog=get('Dialog'),form=get('Form'),debug=get('Debug'),input=get('Input');
 const apply=get('Apply'),defaults=get('Default'),error=get('Error'),status=get('Status');
 const titleButton=get('OpenTitle'),settingsButton=get('OpenSettings');
 ui.titleScreen.appendChild(titleButton);ui.settingsDialog.appendChild(settingsButton);titleButton.hidden=false;
 let returnFocus=null;
 const stop=e=>{e?.preventDefault?.();e?.stopPropagation?.();};
 function sync(){
  const safe=trialSeedOffsetCanApply();
  debug.checked=debugMode;debug.disabled=!DEBUG_FEATURES_ALLOWED || !['choosing','map'].includes(state);
  settingsButton.hidden=!debugMode;
  get('Controls').hidden=!debugMode;
  input.disabled=apply.disabled=defaults.disabled=!safe;
  const offset=ASCENT_TRIAL_SEEDS.offset;
  titleButton.textContent='試遊設定（SEED +'+offset+'）';
  get('Current').textContent='現在: '+offset+' ／ STAGE 1 の SEED: '+((1+offset)>>>0);
  get('Warning').textContent=!['choosing','map'].includes(state)?'マップに戻ってから適用してください':
   !debugMode?'DEBUG モードを ON にすると編集できます。':!safe?'画面の切り替えや他の操作が終わってから開き直してください。':'';
 }
 function close(){
  if(!dialog.open)return false;
  dialog.close();settingsOpen=false;
  returnFocus?.focus?.({preventScroll:true});requestGameRender();return true;
 }
 function open(event,origin='title'){
  stop(event);
  if(dialog.open)return false;
  if(origin==='title' && state!=='choosing')return false;
  if(origin==='settings' && !settingsOpen)return false;
  returnFocus=origin==='title'?titleButton:state==='map'?ui.mapSettingsButton:state==='daily'?ui.dailySettingsButton:canvas;
  hideSettings();settingsOpen=true;
  input.value=String(ASCENT_TRIAL_SEEDS.offset);error.textContent=status.textContent='';input.removeAttribute('aria-invalid');
  sync();dialog.showModal();
  (debugMode&&!input.disabled?input:debug.disabled?get('Close'):debug).focus();return true;
 }
 titleButton.onclick=e=>open(e,'title');settingsButton.onclick=e=>open(e,'settings');
 // Title itself is a keyboard/click start target; these controls never start it.
 titleButton.addEventListener('keydown',e=>e.stopPropagation());
 debug.onchange=()=>{
  if(!debug.disabled)setDebugMode(debug.checked);
  error.textContent=status.textContent='';sync();
 };
 defaults.onclick=()=>{
  if(defaults.disabled)return;
  input.value='200';error.textContent='';input.removeAttribute('aria-invalid');
  status.textContent='入力を 200 に戻しました。反映するには「適用」を押してください。';input.focus();
 };
 form.onsubmit=e=>{
  stop(e);error.textContent=status.textContent='';
  const result=applyTrialSeedOffset(input.value);
  if(!result.ok){
   error.textContent=result.error==='invalid-offset'?'0〜4294967295 の整数を入力してください。':'マップに戻り、DEBUG モードを ON にしてから適用してください。';
   input.setAttribute('aria-invalid',String(result.error==='invalid-offset'));sync();return;
  }
  input.value=String(result.offset);input.removeAttribute('aria-invalid');sync();
  status.textContent=result.persisted?'適用しました。次の通常コースから反映します。':'このセッションに適用しました。保存できなかったため、再読み込みすると元に戻る場合があります。';
 };
 get('Close').onclick=close;
 dialog.addEventListener('cancel',e=>{stop(e);close();});
 dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}});
 // A queued close event may arrive after this dialog (or settings) reopens.
 dialog.addEventListener('close',()=>{settingsOpen=dialog.open || !!ui.settingsDialog.open;});
 // Closing the old settings modal queues its close event; do not let that
 // late event re-enable gameplay underneath the newly opened trial modal.
 ui.settingsDialog.addEventListener('close',()=>{if(dialog.open)settingsOpen=true;});
 const previousDebug=setDebugMode;setDebugMode=function(...args){const result=previousDebug.apply(this,args);sync();return result;};
 const previousOpen=openSettings;openSettings=function(...args){const result=previousOpen.apply(this,args);sync();return result;};
 ui.settingsButton.onclick=ui.mapSettingsButton.onclick=ui.dailySettingsButton.onclick=openSettings;
 globalThis.ASCENT_TRIAL_SEED_UI=Object.freeze({open,close,sync});sync();
})();
