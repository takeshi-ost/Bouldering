'use strict';
// Formal Pages DEBUG utility: canonical normal courses stay at +10. Alternate
// corrections use existing debugAttempt semantics, never the v4 leaderboard.
(() => {
 if(!globalThis.ASCENT_FORMAL_PAGES)return;
 const KEY='ascent.formal-debug-seed.v1',storage=globalThis.ASCENT_FORMAL_STORAGE;
 const parse=raw=>typeof raw==='string'&&/^[0-9]+$/.test(raw.trim())&&Number.isSafeInteger(Number(raw))&&Number(raw)<=4294967295?Number(raw):null;
 let offset=10;
 try{offset=parse(storage.getItem(KEY))??10;}catch(_){}
 const form=document.createElement('form');form.id='formalDebugSeed';form.hidden=true;form.noValidate=true;
 const label=document.createElement('label'),input=document.createElement('input'),help=document.createElement('p'),button=document.createElement('button'),status=document.createElement('p');
 input.id='formalDebugSeedInput';input.type='text';input.inputMode='numeric';input.autocomplete='off';input.spellcheck=false;input.value=String(offset);label.htmlFor=input.id;
 help.id='formalDebugSeedHelp';input.setAttribute('aria-describedby',help.id+' formalDebugSeedStatus');
 button.type='submit';status.id='formalDebugSeedStatus';status.setAttribute('role','status');
 form.append(label,input,help,button,status);document.getElementById('mapSettingsDebug').append(form);
 const custom=()=>DEBUG_FEATURES_ALLOWED&&debugMode&&offset!==10;
 const safe=()=>state==='map'&&debugMode&&!stageStartContext&&!mapPreparing&&!mapTransition&&!dailyRun&&!debugCourseTrial&&!lifePrompt&&!dummyAd&&!adCoverPending&&!rewardSequence&&!rewardCoverPending;
 function refresh(){
  form.hidden=!DEBUG_FEATURES_ALLOWED||!debugMode;
  input.disabled=button.disabled=!safe();
  label.textContent=gameText('formal.seed.label');help.textContent=gameText('formal.seed.help');button.textContent=gameText('formal.seed.apply');
 }
 function setCourseOffset(){CourseProgressionConfig.normalSeedOffset=custom()?offset:10;stagePreviewCache.clear();}
 function apply(raw){
  const next=parse(raw);if(next===null)return {ok:false,key:'formal.seed.invalid'};
  if(!safe())return {ok:false,key:'formal.seed.unsafe'};
  offset=next;setCourseOffset();let persisted=true;
  try{storage.setItem(KEY,String(offset));if(storage.getItem(KEY)!==String(offset))persisted=false;}catch(_){persisted=false;}
  renderLevelMap();refresh();return {ok:true,key:persisted?'formal.seed.saved':'formal.seed.unsaved',offset};
 }
 form.onsubmit=e=>{e.preventDefault();e.stopPropagation();const result=apply(input.value);status.textContent=gameText(result.key);input.setAttribute('aria-invalid',String(!result.ok&&result.key==='formal.seed.invalid'));};
 const originalDebug=setDebugMode;setDebugMode=function(enabled){
  if(DEBUG_FEATURES_ALLOWED){CourseProgressionConfig.normalSeedOffset=enabled?offset:10;stagePreviewCache.clear();}
  const result=originalDebug.call(this,enabled);refresh();return result;
 };
 const originalOpen=openStageStart;openStageStart=function(n,debug=false,...rest){return originalOpen.call(this,n,debug||custom(),...rest);};
 const originalSelect=selectStage;selectStage=function(n,debug=false,...rest){return originalSelect.call(this,n,debug||custom(),...rest);};
 const originalSettings=openSettings;openSettings=function(...args){const result=originalSettings.apply(this,args);refresh();return result;};
 ui.settingsButton.onclick=ui.mapSettingsButton.onclick=ui.dailySettingsButton.onclick=openSettings;
 const previousRefresh=refreshGameLanguage;refreshGameLanguage=function(...args){const result=previousRefresh.apply(this,args);refresh();return result;};
 Object.defineProperty(globalThis,'ASCENT_FORMAL_DEBUG_SEED',{value:Object.freeze({parse,apply,refresh,get offset(){return offset;}}),writable:false});
 setCourseOffset();refresh();
})();
