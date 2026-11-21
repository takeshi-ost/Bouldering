'use strict';
// Real metadata/reward code in independent VMs. No SDK, service or account writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const metadata=fs.readFileSync('js/score-metadata.js','utf8'),rewards=fs.readFileSync('js/rewards.js','utf8');
function fixture(version='r1',data=new Map(),shared={inventoryWrites:0}) {
 if(!data.has('ascent.heart-items.v1'))data.set('ascent.heart-items.v1','5');
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(k==='ascent.heart-items.v1')shared.inventoryWrites++;data.set(k,String(v));},key:i=>[...data.keys()][i],get length(){return data.size;}};
 const node=()=>({style:{},classList:{toggle(){}},addEventListener(){},showModal(){},close(){}});
 const c=vm.createContext({localStorage:storage,console,shared,performance:{now:()=>1000},document:{hidden:false,addEventListener(){}},requestAnimationFrame(){},ui:{rewardDialog:node(),rewardWheel:node(),rewardStatus:node(),rewardResult:node(),rewardStop:node(),overlay:node()}});
 vm.runInContext(`let state='won',dailyRun=null,debugAttempt=false,courseMode='existing',level=4,playsSinceAd=0,runStartedAt=null,runElapsedMs=0,bodyTap=null,touchId=null,ignoreTouches=false,finished=0;
 const NORMAL_AD_FIRST_STAGE=11,NORMAL_AD_PLAY_INTERVAL=3,HEART_ITEM_IMAGE_SRC='';let heartItems=Number(localStorage.getItem('ascent.heart-items.v1')),lives={count:3};const playerColors=['#123456'],playerHeadColor='#abcdef',LIFE_MAX=5;
 function isTutorialRun(){return false;}function gameText(k){return k;}function createPlayerIcon(){return {};}function playerIconMarkup(){return '';}function heartItemIconMarkup(){return '';}
 function release(){}function endPan(){}function hideSettings(){}function hideResultModal(){}function requestGameRender(){}function schedulePresentationUpdates(){}function playSound(){}function showResultModal(){}function recoverLives(){}function grantLife(){lives.count++;shared.lifeGrants=(shared.lifeGrants||0)+1;}function saveHeartItems(){localStorage.setItem('ascent.heart-items.v1',heartItems);}
 `+metadata.replace("const RECORD_VERSION='r1'",`const RECORD_VERSION='${version}'`)+rewards,c);
 const date='2026-11-15';
 if(!data.has('ascent.daily-records.v1.'+version))data.set('ascent.daily-records.v1.'+version,JSON.stringify({[date]:{recordVersion:version,scoreSpecVersion:'v4',moves:1,timeMs:1,stars:1,rewardStatus:'pending'}}));
 const daily=fs.readFileSync('js/daily.js','utf8');vm.runInContext('function showDailyCalendar(){finished++;}'+daily.slice(0,daily.indexOf('let dailyMonth=')),c);
 return {data,shared,run:s=>vm.runInContext(s,c),start:()=>vm.runInContext("mapRewards[4]={status:'pending',adRequired:false,adCompleted:false};startMapClearReward(4,()=>{finished++;})",c),startDaily:()=>vm.runInContext(`startDailyClearReward('${date}')`,c),grant:(index=0)=>vm.runInContext(`rewardSequence.phase='braking';rewardSequence.brakeElapsed=ROULETTE_BRAKE_MS;rewardSequence.lastTime=1000;rewardSequence.from=-ROULETTE_SEGMENTS[${index}].center-ROULETTE_SPEED*ROULETTE_BRAKE_MS/3;advanceRewardSequence(1000);`,c)};

}
// Replacement device has only imported receipts, no old map or Daily records.
const imported=new Map([['ascent.reward-claims.v1.r1',JSON.stringify({map:['4'],daily:['2026-11-15']})]]);
const next=fixture('r2',imported);assert.equal(next.start(),false);
assert(next.run("previouslyClaimedReward('ascent.daily-records.v1','2026-11-15',true)"));
assert.equal(next.run('rewardClaimHistory().map.join()'),'4');assert.equal(next.shared.inventoryWrites,0);
for(const value of ['{broken',JSON.stringify({map:4,daily:[]}),JSON.stringify({map:['4']})]) {
 const corrupt=new Map([['ascent.reward-claims.v1.r1',value]]),blocked=fixture('r2',corrupt);
 assert.equal(blocked.start(),false);assert.equal(blocked.shared.inventoryWrites,0);
 assert.equal(corrupt.get('ascent.reward-claims.v1.r1'),value);
}
// Explicit transfer replaces a wallet, not the identities of preserved old files.
const foreignRaw=JSON.stringify({4:{status:'claimed'}}),foreignReceipt=JSON.stringify({map:['4'],daily:[]});
const destination=new Map([
 ['ascent.map-rewards.v1',foreignRaw],['ascent.reward-claims.v1.r1',foreignReceipt],
 ['ascent.reward-claims.v1.r2',JSON.stringify({map:['12'],daily:[]})],
 ['ascent.reward-history-scope.v1',JSON.stringify({ownerUid:'imported-owner',excludedKeys:['ascent.map-rewards.v1','ascent.daily-records.v1','ascent.reward-claims.v1.r1']})]
]);
const importedWallet=fixture('r2',destination);assert(importedWallet.start());
assert(importedWallet.run("previouslyClaimedReward('ascent.map-rewards.v1',12)"));
const later=fixture('r3',destination);assert(!later.run("previouslyClaimedReward('ascent.map-rewards.v1',4)"));
assert(later.run("previouslyClaimedReward('ascent.map-rewards.v1',12)"));
assert.equal(destination.get('ascent.map-rewards.v1'),foreignRaw);assert.equal(destination.get('ascent.reward-claims.v1.r1'),foreignReceipt);
// A copied old receipt and later-version receipt both remain entitlement evidence.
imported.set('ascent.reward-claims.v1.r3',JSON.stringify({map:['8'],daily:[]}));
assert(next.run("previouslyClaimedReward('ascent.map-rewards.v1',8)"));
// Reading a saved pending receipt in a newly opened document treats it as
// received locally without writing over an older tab's active roulette.
const oldPending=new Map([['ascent.map-rewards.v1.r1',JSON.stringify({4:{status:'pending',adRequired:true,adCompleted:false}})]]);
const cold=fixture('r1',oldPending);assert.equal(cold.run('mapRewards[4].status'),'claimed');
assert.equal(JSON.parse(oldPending.get('ascent.map-rewards.v1.r1'))[4].status,'pending');
assert.equal(cold.shared.inventoryWrites,0);
// Both dialogs were already open. Same-season and cross-season contexts recheck
// persisted evidence immediately before mutation, without a fake global wallet.
for(const versions of [['r1','r1'],['r1','r2'],['r2','r1']])for(const index of [0,3])for(const daily of [false,true]) {
 const data=new Map(),shared={inventoryWrites:0},a=fixture(versions[0],data,shared),b=fixture(versions[1],data,shared);
 assert(daily?a.startDaily():a.start());assert(daily?b.startDaily():b.start());a.grant(index);b.grant(index);
 assert.equal(shared.inventoryWrites,index===0?1:0);assert.equal(shared.lifeGrants||0,index===3?1:0);
 assert.equal(a.run('heartItems'),index===0?6:5);assert.equal(b.run('heartItems'),5);
 assert.equal(a.run('lives.count'),index===3?4:3);assert.equal(b.run('lives.count'),3);
 assert.equal(b.run('finished'),1);assert.equal(b.run(daily?"dailyRecords['2026-11-15'].rewardStatus":'mapRewards[4].status'),'claimed');
}
// Separate devices have separate wallets/receipts, as before this feature. A
// client-side record generation cannot implement account-wide reward settlement.
const a=fixture(),b=fixture();assert(a.start());assert(b.start());a.grant();b.grant();
assert.equal(a.shared.inventoryWrites,1);assert.equal(b.shared.inventoryWrites,1);
assert.equal(a.run('heartItems'),6);assert.equal(b.run('heartItems'),6);
console.log('PASS reward compatibility: imported receipt-only rollover; all-season evidence; stale same/cross-season dialog grants suppressed; independent device wallets remain independent');
