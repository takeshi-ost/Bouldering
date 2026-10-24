'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const game=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ascent-build-policy-'));
try {
    const src=path.join(temp,'source');fs.mkdirSync(path.join(src,'App/public/js'),{recursive:true});
    fs.writeFileSync(path.join(src,'App/public/js/game.js'),game);
    function prepare(configuration,product=configuration) {
        const target=path.join(temp,product);fs.mkdirSync(path.join(target,'App.app/public/js'),{recursive:true});
        const result=spawnSync('/bin/sh',[path.join(root,'scripts/prepare-ios-build.sh')],{
            env:{...process.env,SRCROOT:src,TARGET_BUILD_DIR:target,UNLOCALIZED_RESOURCES_FOLDER_PATH:'App.app',CONFIGURATION:configuration},encoding:'utf8'});
        assert.equal(result.status,0,result.stderr);
        assert.equal(fs.readFileSync(path.join(target,'App.app/ascent-build-configuration.txt'),'utf8').trim(),configuration);
        return fs.readFileSync(path.join(target,'App.app/public/js/game.js'),'utf8');
    }
    const debug=prepare('Debug'),release=prepare('Release');
    assert.equal(debug,game);assert.equal(release,game.replace('let debugMode = false;','const debugMode = false;'));
    assert.equal(prepare('Debug','Release'),game,'An old Release product must not make a subsequent Debug immutable');
    assert.equal(prepare('Release','Debug'),release,'An old Debug product must not leak mutable debug state into Release');
    assert.equal(fs.readFileSync(path.join(src,'App/public/js/game.js'),'utf8'),game,'Never modify shared source assets');
    const envSource=`
const elements={};
const document={getElementById(id){return elements[id] ||= {
 style:{setProperty(){}},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};
const window={addEventListener(){},devicePixelRatio:1};
class Image {decode(){return new Promise(()=>{});}}
function requestAnimationFrame(){}
`;
    function run(configuration,native=true,inject=true) {
        const saved=new Map([['debug','true'],['debugMode','true'],['ascent.debug-mode.v1','true']]);
        const context=vm.createContext({assert,console,location:{protocol:native?'capacitor:':'https:',search:'?debug=true&debugMode=true',hash:'#debug=true'},
            localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)}});
        if(native && inject)vm.runInContext(`Object.defineProperty(globalThis,'ASCENT_IOS_BUILD',{value:Object.freeze(${JSON.stringify({configuration,debugAllowed:configuration==='Debug',firebaseEnabled:false})}),writable:false,configurable:false})`,context);
        const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]==='js/game.js'?(configuration==='Release'?release:debug):fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
        vm.runInContext(envSource+source,context,{filename:`${configuration}-policy-test.js`});
        vm.runInContext(`assert.equal(debugMode,false,'Saved flags and URL must not enable debug at boot');state='map';mapPreparing=false;mapTransition=null;openSettings();`,context);
        const allowed=!native || (configuration==='Debug' && inject);
        vm.runInContext(`
assert.equal(DEBUG_FEATURES_ALLOWED,${allowed});
assert.equal(ui.mapDebugModeRow.hidden,${!allowed});assert.equal(ui.mapDebugMode.disabled,${!allowed});
ui.mapDebugMode.checked=true;ui.mapDebugMode.onchange();
assert.equal(debugMode,${allowed});assert.equal(ui.mapDebugMode.checked,${allowed});
assert.equal(ui.debugControls.hidden,${!allowed});
assert.equal(canSelectStage(999,true),${allowed});
`,context);
        if(!allowed)vm.runInContext(`
setDebugMode(true);assert.equal(debugMode,false);assert(ui.prototypeCourse.hidden);assert(ui.prototypeDescription.hidden);
ui.prototypeCourse.onclick();assert.equal(courseMode,'existing');startCourse('prototype');assert.equal(courseMode,'existing');
assert.throws(()=>{debugMode=true;},TypeError);
state='lost';dailyRun=null;stageStartContext=null;level=999;debugAttempt=true;
assert.equal(canSelectStage(999,true,true),false,'Even legacy debug retry state is rejected');
`,context);
        else vm.runInContext('setDebugMode(false);assert.equal(debugMode,false);assert.equal(ui.mapDebugMode.checked,false);',context);
        if(native && inject)vm.runInContext(`assert.throws(()=>Object.defineProperty(globalThis,'ASCENT_IOS_BUILD',{value:{debugAllowed:true}}),TypeError);assert.equal(ASCENT_IOS_BUILD.debugAllowed,${configuration==='Debug'});assert.equal(ASCENT_IOS_BUILD.firebaseEnabled,false);`,context);
    }
    run('Debug');run('Release');run('Release',true,false);run('Debug',false,false);
    console.log('PASS build policy: Debug toggle; immutable Release OFF despite old saves/URL/direct assignment/retry/prototype; hidden UI; native fail-closed; unchanged Web; Debug/Release products never contaminate source or each other');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
