'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8');
const files=fs.readdirSync('js').filter(p=>p.endsWith('.js'));
const source=Object.fromEntries(files.map(p=>[p,fs.readFileSync(path.join('js',p),'utf8')]));
for(const [file,text] of Object.entries(source)){
 assert(!/\b(?:onkeydown|onkeyup)\b|['"](?:keydown|keyup)['"]|\btabindex\b/.test(text),file+' custom keyboard control remains');
 const focuses=text.match(/[\w.]+\.focus\??\.[(]|[\w.]+\.focus\(/g)||[];
 assert.deepEqual(focuses,file==='appearance.js'?['ui.playerName.focus(']:[],file+' navigation autofocus remains');
}
assert(!/\b(?:tabindex|autofocus)\b/.test(html),'No decorative tab stop or autofocus in static UI');
assert(!/:focus(?:-visible|-within)?\b|--button-keyboard|--button-focus\b/.test(css),'No focus-only UI styling');
assert(/canvas\s*\{[^}]*touch-action:none;[^}]*cursor:grab;/.test(css),'Mouse drag affordance preserved');
assert(css.includes('cursor: pointer')&&css.includes('cursor: grabbing'),'Pointer affordances preserved');
assert(source['input.js'].includes("canvas.addEventListener('wheel'"));
for(const event of ['mousedown','touchstart','touchmove','touchend','touchcancel'])assert(source['input.js'].includes("'"+event+"'"),event);
assert(source['appearance.js'].includes('ui.playerName.oncompositionend=limitPlayerNameInput'));
assert(source['appearance.js'].includes('if(!e.isComposing)limitPlayerNameInput()'));
assert(source['appearance.js'].includes('ui.playerName.blur?.();playerName=name;'),'Save dismisses mobile keyboard');
assert(source['level-map.js'].includes('ui.debugStage.blur?.()'),'Debug launch dismisses numeric keyboard');
for(const file of ['input.js','tutorial.js','rewards.js','ads.js'])assert(source[file].includes("'cancel'"),file+' native modal invariant');
for(const [file,action] of [['online.js','resumeOnline'],['lives.js','refreshLives'],['daily.js','refreshDailyCalendar']])assert(source[file].includes("window.addEventListener('focus',"+action),file+' app resume kept');
assert(source['input.js'].includes("window.addEventListener('blur'"),'Leaving window still cancels dragging');
assert(source['audio.js'].includes("window.addEventListener('blur',stopSounds)"));
const native=fs.readFileSync('scripts/native-audio-lifecycle.js','utf8');
assert(native.includes("['pointerup', 'touchend', 'click']"));assert(!native.includes("'keydown'"));
const debug=fs.readFileSync('scripts/formal-debug-seed.js','utf8');
assert(debug.includes("input.inputMode='numeric'")&&debug.includes('form.onsubmit='),'Text/number input remains usable');
console.log('PASS pointer-only UI: custom keyboard navigation/tab stops/focus decoration removed; mouse drag/wheel and touch, IME/name correction/mobile keyboard dismissal, native modal guards and app resume retained');
