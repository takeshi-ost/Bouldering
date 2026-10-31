'use strict';
(function trialBootstrap(settings,audioPaths) {
 const allowedAudio=new Set(audioPaths),nativeFetch=globalThis.fetch?.bind(globalThis);
 const ASCENT_TRIAL=Object.freeze(settings);
 const storage=()=>globalThis.localStorage;
 const ownKeys=()=>{const s=storage(),keys=[];for(let i=0;i<s.length;i++){const k=s.key(i);if(k?.startsWith(settings.namespace))keys.push(k);}return keys;};
 const ASCENT_TRIAL_STORAGE=Object.freeze({
  getItem:key=>storage().getItem(settings.namespace+String(key)),
  setItem:(key,value)=>storage().setItem(settings.namespace+String(key),String(value)),
  removeItem:key=>storage().removeItem(settings.namespace+String(key)),
  clear:()=>{for(const key of ownKeys())storage().removeItem(key);},
  key:index=>ownKeys()[index]?.slice(settings.namespace.length)??null,
  get length(){return ownKeys().length;}
 });
 const ASCENT_TRIAL_AUDIO_FETCH=async url=>{
  // Only relative, known packaged public media. No credentials, writes, redirects,
  // arbitrary same-origin endpoints, Firebase or remote service connections.
  if(typeof url!=='string' || !allowedAudio.has(url.split('?')[0]) || !/^assets\/audio\/[a-z0-9-]+[.](wav|mp3)(?:[?]v=[a-f0-9]+)?$/.test(url))throw Error('Trial audio URL is not allowed');
  if(!nativeFetch)throw Error('Audio fetch unavailable');
  return nativeFetch(url,{method:'GET',mode:'same-origin',credentials:'omit',redirect:'error'});
 };
 for(const [name,value] of Object.entries({ASCENT_TRIAL,ASCENT_TRIAL_STORAGE,ASCENT_TRIAL_AUDIO_FETCH}))
  Object.defineProperty(globalThis,name,{value,writable:false,configurable:false});
})({"release":"0.4.13","distribution":"7","identity":"trial-d6-0.4.12","namespace":"ascent.pages-trial.0.4.12.d6.","commit":"e36c374a1ce16e8d2180f4f82e8dcef437b33c97","dirty":false},["assets/audio/bgm-loop.mp3","assets/audio/bgm-stage-loop.mp3","assets/audio/hazard-fix.wav","assets/audio/heart-recovery.wav","assets/audio/launch.wav","assets/audio/map-steps.wav","assets/audio/move.wav","assets/audio/stage-clear.wav","assets/audio/stage-fail.wav","assets/audio/stage-start.wav"]);
