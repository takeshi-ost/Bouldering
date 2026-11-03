'use strict';
globalThis.ASCENT_FORMAL_PAGES=Object.freeze({"release":"0.4.54","commit":"669e9ec8d0b14d655e4b3bfbf9e3cf83ce24e51f","storagePrefix":"ascent.pages-trial.0.4.12.d6."});
'use strict';
// Continue the existing Pages save in place. This is a key adapter, not a migration.
(() => {
 const prefix='ascent.pages-trial.0.4.12.d6.';
 const physicalKey=key=>String(key).startsWith(prefix)?String(key):prefix+String(key);
 const keys=()=>{const storage=globalThis.localStorage,result=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(prefix))result.push(key);}return result;};
 const storage=Object.freeze({physicalKey,
  getItem:key=>globalThis.localStorage.getItem(physicalKey(key)),
  setItem:(key,value)=>globalThis.localStorage.setItem(physicalKey(key),String(value)),
  removeItem:key=>globalThis.localStorage.removeItem(physicalKey(key)),
  clear:()=>{for(const key of keys())globalThis.localStorage.removeItem(key);},
  key:index=>keys()[index]?.slice(prefix.length)??null,
  get length(){return keys().length;}
 });
 Object.defineProperty(globalThis,'ASCENT_FORMAL_STORAGE',{value:storage,writable:false,configurable:false});
})();
