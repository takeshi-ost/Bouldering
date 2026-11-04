'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const KEY = 'ascent.language.v1', TUTORIAL = 'ascent.tutorial-stage0.v1';
const scripts = [...read('index.html').matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(match => match[1]);
assert.equal(scripts[0], 'js/tutorial-state.js');
assert(scripts.indexOf('js/tutorial-state.js') < scripts.indexOf('js/text.js'), 'First-use detection must run before the initial language save');
assert(scripts.indexOf('js/text.js') < scripts.indexOf('js/config.js'), 'Initial strings must use the selected locale');
const bootstrap = scripts.slice(0, scripts.indexOf('js/config.js') + 1);
function boot(data = new Map(), options = {}) {
    const operations = [];
    const storage = {
        getItem(key) {
            operations.push(['get', key]);
            if (options.readBlocked || options.readKey === key) throw Error('Read denied');
            return data.get(key) ?? null;
        },
        setItem(key, value) {
            operations.push(['set', key, value]);
            if (options.writeBlocked || options.writeKey === key) throw Error('Write denied');
            if (!options.ignoreWrites) data.set(key, String(value));
        },
        removeItem() { throw Error('Language initialization must never delete storage'); },
        clear() { throw Error('Language initialization must never clear storage'); }
    };
    const choice = {}, label = {getAttribute: () => 'ui.settingsTitle'}, document = {
        documentElement: {}, getElementById: id => id === 'languageChoice' ? choice : null,
        querySelectorAll: selector => selector === '[data-i18n]' ? [label] : []
    };
    const globals = {document, navigator: options.navigator ?? {language:'en-US', languages:['en-US', 'ja-JP']},
        fetch() { throw Error('Locale selection must not make network requests'); },
        localStorage: options.missingStorage ? undefined : storage};
    if (Object.hasOwn(options, 'native')) globals.ASCENT_IOS_BUILD = Object.freeze(options.native);
    if (options.storageGetterBlocked) Object.defineProperty(globals, 'localStorage', {get() { throw Error('Storage denied'); }});
    const context = vm.createContext(globals);
    for (const file of bootstrap) vm.runInContext(read(file), context, {filename:file});
    return {data, operations, choice, label, document,
        run: code => vm.runInContext(code, context),
        language: () => vm.runInContext('GAME_TEXT_LANGUAGE', context),
        persisted: () => vm.runInContext('GAME_TEXT_LANGUAGE_PERSISTED', context),
        tutorial: () => vm.runInContext('AscentTutorialState.snapshot()', context)};
}
const writes = b => b.operations.filter(([operation, key]) => operation === 'set' && key === KEY);
const marker = status => JSON.stringify({version:1, status, reason:'new-player'});

// Only a genuinely new player uses the primary device/browser language.
for (const [language, expected] of [
    ['ja','ja'], ['ja-JP','ja'], ['JA-jp','ja'], ['jA-Jpan-JP','ja'], ['ja_US','ja'], [' ja-JP ','ja'],
    ['en','en'], ['en-US','en'], ['fr-FR','en'], ['zh-Hant-TW','en'], ['ko-KR','en'], ['ar','en'],
    ['japanese','en'], ['jargon','en'], ['jafoo','en'], ['x-ja','en'], ['', 'en']
]) {
    const b = boot(new Map([['other.app', 'untouched']]), {navigator:{language, languages:[language, 'ja-JP']}});
    assert.equal(b.language(), expected, language);
    assert.equal(b.persisted(), true);
    assert.equal(b.data.get(KEY), expected);
    assert.equal(b.tutorial().firstUse, true);
    assert.equal(b.tutorial().status, 'pending', 'The language save must not skip Stage 0');
    assert.equal(b.data.get('other.app'), 'untouched');
    assert.equal(writes(b).length, 1, 'Persist the initial choice exactly once');
    assert.deepEqual([...b.data.keys()].sort(), [KEY,TUTORIAL,'other.app'].sort());
    assert(!Object.hasOwn(JSON.parse(b.data.get(TUTORIAL)), 'firstUse'), 'First-use evidence must never be saved');
    assert.equal(b.document.documentElement.lang, expected);
    assert.equal(b.choice.value, expected);
    assert.equal(b.label.textContent, expected === 'ja' ? '設定' : 'Settings');
    assert.equal(b.run('GAMEPLAY_TIPS[1]'), expected === 'ja' ? 'ボディをタップで1ムーブ戻せるよ！' : 'Tap your body to undo one move!');
    const setOperations = b.operations.filter(([operation]) => operation === 'set');
    assert.deepEqual(setOperations.map(([,key]) => key), [TUTORIAL, KEY]);
    // A changed system language cannot override the once-saved choice, even
    // when first onboarding was interrupted and the tutorial remains pending.
    const next = boot(b.data, {navigator:{language:expected === 'ja' ? 'en-US' : 'ja-JP'}});
    assert.equal(next.language(), expected);
    assert.equal(next.tutorial().firstUse, false);
    assert.equal(next.tutorial().status, 'pending');
    assert.equal(writes(next).length, 0);
}
for (const [navigator, expected] of [
    [{languages:['ja-JP','en-US']},'ja'], [{language:'',languages:['ja-JP']},'ja'],
    [{language:'  ',languages:['ja-JP']},'ja'], [{language:7,languages:['ja-JP']},'ja'],
    [{languages:['fr-FR','ja-JP']},'en'], [{languages:[null,'ja-JP']},'en'],
    [{language:'en-US',languages:['ja-JP']},'en'], [{language:'ja-JP',languages:['en-US']},'ja'],
    [{},'en'], [{languages:[]},'en']
]) assert.equal(boot(new Map(), {navigator}).language(), expected);
const unreadableNavigator = {};
Object.defineProperty(unreadableNavigator, 'language', {get() { throw Error('No locale'); }});
assert.equal(boot(new Map(), {navigator:unreadableNavigator}).language(), 'en');
assert.equal(boot(new Map(), {native:{},navigator:{language:'ja-JP'}}).language(),'ja', 'Older native metadata without a locale uses the primary browser language');
for (const preferredLanguage of ['',null,undefined,7])
    assert.equal(boot(new Map(), {native:{preferredLanguage},navigator:{language:'ja-JP'}}).language(),'en', 'Present native locale is authoritative even when unavailable');
for (const state of [undefined,{snapshot:()=>({status:'pending',reason:'new-player',persisted:true})}]) {
    const context = vm.createContext({AscentTutorialState:state,navigator:{language:'en-US'},
        localStorage:{getItem:()=>null,setItem(){throw Error('No first-use evidence: do not write');}}});
    for (const file of ['js/text-ja.js','js/text-en.js','js/text-dev-ja.js','js/text.js']) vm.runInContext(read(file),context);
    assert.equal(vm.runInContext('GAME_TEXT_LANGUAGE',context),'ja', 'Missing/older tutorial API is not reliable first-use evidence');
}

// Existing valid choices win over OS settings and every tutorial marker.
for (const saved of ['ja','en']) for (const status of [null,'pending','completed','skipped']) {
    const data = new Map([[KEY, saved], ['ascent.progress.v1', '{"existing":{"cleared":20}}']]);
    if (status) data.set(TUTORIAL, marker(status));
    const before = new Map(data), b = boot(data, {navigator:{language:saved === 'ja' ? 'en-US' : 'ja-JP'}});
    assert.equal(b.language(), saved);
    assert.equal(b.persisted(), true);
    assert.equal(writes(b).length, 0);
    for (const [key,value] of before) assert.equal(data.get(key), value, key);
}
// Any prior app save, including empty/corrupt selection, retains historical JA.
const legacyKeys = [...read('js/tutorial-state.js').match(/const legacyKeys=\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
for (const key of legacyKeys) for (const value of ['', '0', '{}', 'malformed']) {
    const b = boot(new Map([[key, value], ['other.app','keep']]));
    assert.equal(b.language(), 'ja', key + ':' + value);
    assert.equal(b.tutorial().firstUse, false);
    assert.equal(b.tutorial().status, 'skipped');
    assert.equal(writes(b).length, 0, 'Do not repair or replace an old invalid choice automatically');
    assert.equal(b.data.get(key), value);
    assert.equal(b.data.get('other.app'), 'keep');
}
for (const value of ['JA','ja-JP','en-US','__proto__','constructor','null','undefined']) {
    const b = boot(new Map([[KEY, value]]));
    assert.equal(b.language(), 'ja');assert.equal(b.data.get(KEY), value);assert.equal(writes(b).length, 0);
}
for (const savedMarker of [marker('pending'),marker('completed'),marker('skipped'),'', 'null', 'malformed', '{"version":9,"status":"pending"}']) {
    const b = boot(new Map([[TUTORIAL, savedMarker]]));
    assert.equal(b.language(), 'ja', 'An old interrupted tutorial without a choice is not a fresh install');
    assert.equal(b.tutorial().firstUse, false);
    assert.equal(b.data.get(TUTORIAL), savedMarker);
    assert.equal(writes(b).length, 0);
}

// Missing/denied reads cannot prove first use. A readable empty store with
// denied writes may use English this session but must not claim persistence.
for (const options of [{missingStorage:true},{readBlocked:true},{storageGetterBlocked:true},{readKey:KEY},{readKey:'ascent.records.v1'}]) {
    const b = boot(new Map(), options);
    assert.equal(b.language(), 'ja');assert.equal(b.persisted(), false);assert.equal(writes(b).length, 0);
    assert.equal(b.run("setGameLanguage('en')"), true);assert.equal(b.language(), 'en');
}
for (const options of [{writeBlocked:true},{writeKey:KEY},{ignoreWrites:true}]) {
    const b = boot(new Map(), options);
    assert.equal(b.language(), 'en');assert.equal(b.persisted(), false);assert.equal(b.tutorial().status,'pending');
    assert.equal(writes(b).length, 1);
    assert.equal(b.run("setGameLanguage('ja')"), true);assert.equal(b.language(), 'ja');assert.equal(b.persisted(), false);
}
{
    // If only the preference write fails, its saved tutorial marker makes the
    // next launch an existing player. Persistence must never be promised here.
    const b = boot(new Map(), {writeKey:KEY});
    assert.equal(b.language(),'en');assert.equal(b.persisted(),false);
    const next = boot(b.data);
    assert.equal(next.language(),'ja');assert.equal(next.tutorial().firstUse,false);assert.equal(next.tutorial().status,'pending');
}
{
    // Conversely a denied tutorial marker write does not prevent a successful
    // language save from taking priority on the next launch.
    const b = boot(new Map(), {writeKey:TUTORIAL});
    assert.equal(b.language(),'en');assert.equal(b.persisted(),true);assert.equal(b.tutorial().persisted,false);
    assert.equal(boot(b.data, {navigator:{language:'ja-JP'}}).language(),'en');
}
{
    const b = boot();
    b.run("navigator.language='ja-JP'; navigator.languages=['ja-JP'];");
    assert.equal(b.language(),'en', 'An OS-language change never switches an active session');
    b.run("setGameLanguage('ja')");
    assert.equal(b.data.get(KEY),'ja');assert.equal(b.document.documentElement.lang,'ja');assert.equal(b.persisted(),true);
    const before = JSON.stringify([...b.data]);
    assert.equal(b.run("setGameLanguage('fr')"),false);assert.equal(JSON.stringify([...b.data]),before);
    assert.equal(boot(b.data, {navigator:{language:'en-US'}}).language(),'ja');
}
{
    const options = {writeKey:KEY}, b = boot(new Map(), options);
    assert.equal(b.persisted(),false);
    delete options.writeKey;
    assert.equal(b.run("setGameLanguage('en')"),true, 'An explicit re-selection can persist after storage recovers');
    assert.equal(b.persisted(),true);assert.equal(boot(b.data,{navigator:{language:'ja-JP'}}).language(),'en');
}
console.log('PASS initial language: primary/native locale precedence, early DOM/config, once-only save, manual/saved preference, existing and interrupted users, invalid markers/choices, unchanged other saves, no network and precise storage-failure behavior');
