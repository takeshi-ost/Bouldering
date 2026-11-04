'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./tutorial-modals.cjs');
for(const language of ['ja','en'])for(const won of [true,false]){
 const b=boot(new Map([['ascent.language.v1',language],['ascent.progress.v1',JSON.stringify({existing:{cleared:2},prototype:{cleared:0}})]]));
 b.run(`reset(1);cameraIntro=null;hideStageHelp();finish(${won});`);
 assert.equal(b.run('state'),won?'won':'lost');
 assert.equal(b.node('resultTip').hidden,false);assert(b.node('resultTipText').textContent);
 assert(b.run('GAMEPLAY_TIPS.includes(ui.resultTipText.textContent)'));
 const outcome=b.run('JSON.stringify({state,stageRecords,dailyRecords,lives,heartItems})');
 b.run(`setGameLanguage('${language==='ja'?'en':'ja'}');`);
 assert(b.run('GAMEPLAY_TIPS.includes(ui.resultTipText.textContent)'));
 assert.equal(b.run('JSON.stringify({state,stageRecords,dailyRecords,lives,heartItems})'),outcome);
 assert.equal(b.run("stageHelpCopy('heart').title"),language==='ja'?'Stamina +2':'スタミナ+2');
}
console.log('PASS 0.5.0 UI: JA/EN success/failure Tips remain visible and translated without outcome changes; feature heart title is stamina +2 (synthetic local outcomes)');
