'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('ios/App/App/SceneDelegate.swift');
const start = source.indexOf('let policy: [String: Any] = ');
const end = source.indexOf('\n#if DEBUG', start);
assert(start >= 0 && end > start);
const policy = source.slice(start, end);
assert.match(policy, /"preferredLanguage": Locale\.preferredLanguages\.first \?\? ""/);
assert.doesNotMatch(policy, /resumeLocale|Locale\.current|preferredLocalizations|navigator/);
assert.match(policy, /JSONSerialization\.data\(withJSONObject: policy, options: \[\.sortedKeys\]\)/, 'Serialize locale as JSON, never interpolate raw OS values into JavaScript');
assert.match(policy, /injectionTime: \.atDocumentStart, forMainFrameOnly: true/);
const literal = policy.match(/let source = "(Object\.defineProperty\(globalThis, 'ASCENT_IOS_BUILD'.*?)"\n/)[1];
const files = ['js/tutorial-state.js','js/text-ja.js','js/text-en.js','js/text-dev-ja.js','js/text.js'];
const bootSource = files.map(read).join('\n');
const base = {configuration:'Release',debugAllowed:false,syncStatusAllowed:false,buildNumber:'test',
    firebaseMode:'offline',firebaseEnabled:false,firebaseAuthAllowed:false,firebaseAnonymousAllowed:false,
    firebaseReadsAllowed:false,firebaseAutomaticSyncAllowed:false,audioDiagnosticsEnabled:false};
for (const [preferredLanguage, browserLanguage, expected] of [
    ['ja-JP','en-US','ja'],['JA-Jpan-JP','en-US','ja'],['ja_JP','en-US','ja'],
    ['en-US','ja-JP','en'],['fr-FR','ja-JP','en'],['zh-Hant','ja-JP','en'],
    ['', 'ja-JP','en'],['japanese','ja-JP','en'],['ja\";throw Error(\"unsafe\");','ja-JP','en']
]) {
    const data = new Map(), context = vm.createContext({navigator:{language:browserLanguage,languages:[browserLanguage,'ja-JP']},
        localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}});
    // Execute the production document-start JS literal with a JSON payload.
    vm.runInContext(literal.replace('\\(json)', JSON.stringify({...base, preferredLanguage})), context);
    vm.runInContext(bootSource, context);
    assert.equal(vm.runInContext('GAME_TEXT_LANGUAGE',context),expected);
    assert.equal(data.get('ascent.language.v1'),expected);
    assert.equal(vm.runInContext('AscentTutorialState.pending()',context),true);
    assert.equal(vm.runInContext('Object.isFrozen(ASCENT_IOS_BUILD)',context),true);
    assert.equal(vm.runInContext("Object.getOwnPropertyDescriptor(globalThis,'ASCENT_IOS_BUILD').writable",context),false);
    assert.equal(vm.runInContext("Object.getOwnPropertyDescriptor(globalThis,'ASCENT_IOS_BUILD').configurable",context),false);
    for (const [key,value] of Object.entries(base)) assert.equal(vm.runInContext('ASCENT_IOS_BUILD['+JSON.stringify(key)+']',context),value);
    assert.throws(()=>vm.runInContext("'use strict'; ASCENT_IOS_BUILD.preferredLanguage='en';",context),/read only|readonly|Cannot assign/);
    assert.throws(()=>vm.runInContext("Object.defineProperty(globalThis,'ASCENT_IOS_BUILD',{value:{preferredLanguage:'en'}})",context),/Cannot redefine/);
}
// Saved user choice beats the authoritative native language in both directions.
for (const saved of ['ja','en']) {
    const data = new Map([['ascent.language.v1',saved]]), context = vm.createContext({
        localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},navigator:{language:'ja-JP'}});
    vm.runInContext(literal.replace('\\(json)',JSON.stringify({...base,preferredLanguage:saved==='ja'?'en-US':'ja-JP'})),context);
    vm.runInContext(bootSource,context);
    assert.equal(vm.runInContext('GAME_TEXT_LANGUAGE',context),saved);
}
console.log('PASS iOS initial language: Locale.preferredLanguages.first in immutable JSON metadata at document start, native-over-Web priority, saved preference priority, separate resume alerts, unchanged build gates');
console.log('Coverage: production injection JavaScript executed in VM; no UIKit/Xcode/simulator/device run in this test');
