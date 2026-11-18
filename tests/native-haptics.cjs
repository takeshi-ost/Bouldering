'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const runtime=fs.readFileSync('scripts/native-haptics-runtime.js','utf8');
function boot(data=new Map(),plugin=true){
 const calls=[],checkbox={addEventListener(k,f){this[k]=f;}},document={hidden:false,getElementById:()=>checkbox};
 const context=vm.createContext({document,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},Capacitor:{Plugins:plugin?{AscentHaptics:{click:args=>{calls.push(args.strength);return Promise.resolve();}}}:{}},Promise});
 vm.runInContext(runtime,context);return {context,checkbox,document,calls,data,click:s=>context.AscentHaptics.click(s)};
}
const b=boot();assert.equal(b.checkbox.checked,true);b.click('light');b.click('strong');assert.deepEqual(b.calls,['light','strong']);
b.checkbox.checked=false;b.checkbox.change();b.click('light');assert.equal(b.calls.length,2);
const reloaded=boot(b.data);assert.equal(reloaded.checkbox.checked,false);reloaded.click('strong');assert.equal(reloaded.calls.length,0);
reloaded.checkbox.checked=true;reloaded.checkbox.change();reloaded.document.hidden=true;reloaded.click('light');assert.equal(reloaded.calls.length,0);
reloaded.document.hidden=false;reloaded.click('strong');reloaded.click('bogus');assert.deepEqual(reloaded.calls,['strong']);
const absent=boot(new Map(),false);assert.doesNotThrow(()=>absent.click('light'));
const failed=boot();failed.context.Capacitor.Plugins.AscentHaptics.click=()=>{throw Error('unsupported');};assert.doesNotThrow(()=>failed.click('light'));
failed.context.Capacitor.Plugins.AscentHaptics.click=()=>Promise.reject(Error('unavailable'));assert.doesNotThrow(()=>failed.click('strong'));
const locked=vm.createContext({document:{hidden:false,getElementById:()=>null},get localStorage(){throw Error('storage unavailable');},Promise});vm.runInContext(runtime,locked);assert.doesNotThrow(()=>locked.AscentHaptics.click('light'));
const layout=require('../scripts/native-settings-layout.cjs');const html=fs.readFileSync('index.html','utf8');assert(!html.includes('hapticsEnabled'));const native=layout(html);assert.equal((native.match(/id="hapticsEnabled"/g)||[]).length,1);
for(const [file,label] of [['ja','振動'],['en','Vibration']])assert(fs.readFileSync('js/text-'+file+'.js','utf8').includes('"settings.haptics": "'+label+'"'));
const swift=fs.readFileSync('ios/App/App/AscentHapticsPlugin.swift','utf8');for(const token of ['.light','.medium','DispatchQueue.main.async','applicationState == .active','impactOccurred()'])assert(swift.includes(token));
assert(/if strength == "light" \{\s*generator\.impactOccurred\(intensity: 0\.5\)\s*\} else \{\s*generator\.impactOccurred\(\)\s*\}/.test(swift),'Light impacts use 0.5 intensity; confirmation retains the default medium impact');
assert(fs.readFileSync('ios/App/App/SceneDelegate.swift','utf8').includes('registerPluginInstance(AscentHapticsPlugin())'));
console.log('PASS native haptics: defaults, persistence, mute, visibility, failed bridge/storage, JA/EN native-only checkbox and native wiring');
