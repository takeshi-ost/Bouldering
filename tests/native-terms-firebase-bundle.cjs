'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let imports=0,requests=0;
const context=vm.createContext({
 ASCENT_IOS_BUILD:{firebaseMode:'auto-sync',firebaseEnabled:true,firebaseAuthAllowed:true,firebaseAnonymousAllowed:true,firebaseReadsAllowed:true,firebaseAutomaticSyncAllowed:false},
 localStorage:{getItem:()=>null,setItem(){throw Error('No write before terms');}},
 fetch(){requests++;throw Error('No requests before terms');},
 addEventListener(){},
});
vm.runInContext(fs.readFileSync('www/js/native-firebase-control.js','utf8'),context,{importModuleDynamically(){imports++;throw Error('SDK must not load');}});
(async()=>{
 assert.equal(context.ASCENT_NATIVE_FIREBASE.permissions().network,false);
 await assert.rejects(context.ASCENT_NATIVE_FIREBASE.authenticate({createAnonymous:true}),/auth-disabled/);
 assert.equal(imports,0);assert.equal(requests,0);
 context.ASCENT_TERMS_NETWORK={accepted:false};
 assert.equal(context.ASCENT_NATIVE_FIREBASE.permissions().auth,false);
 context.ASCENT_TERMS_NETWORK={accepted:true};
 assert.equal(context.ASCENT_NATIVE_FIREBASE.permissions().network,true);
 assert.equal(context.ASCENT_NATIVE_FIREBASE.permissions().auth,true);
 assert.equal(imports,0);assert.equal(requests,0);
 console.log('PASS actual auto-sync bundle: SDK import/auth/network suppressed until native terms; accepted enables policy; no real requests');
})();
