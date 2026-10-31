'use strict';
// Shared stamina policy extracted from Site41 / trial 0.11.8.
// Configuration parsing only: no URL, UI, storage or network access.
const LabStaminaSettings=(()=>{
 const DEFAULT_BONUS=3;
 const defaultRules=Object.freeze([Object.freeze({fromStage:0,staminaBonus:DEFAULT_BONUS})]);
 const defaultText=defaultRules.map(r=>`${r.fromStage}:${r.staminaBonus}`).join(',');
 const integer=(value,min,label)=>{
  const text=String(value);
  if(!/^\d+$/.test(text)||!Number.isSafeInteger(Number(text))||Number(text)<min)throw Error(`${label} must be an integer at least ${min}.`);
  return Number(text);
 };
 function parseRules(text=defaultText){
  if(typeof text!=='string'||!text.trim())throw Error('Stamina rules must be nonempty, for example 0:3.');
  const rows=text.trim().split(/[,\n]/).map(row=>{
   const parts=row.trim().match(/^(\d+)\s*:\s*(\d+)$/);
   if(!parts)throw Error('Use one fromStage:bonus pair per rule.');
   return {fromStage:integer(parts[1],0,'fromStage'),staminaBonus:integer(parts[2],0,'common bonus')};
  });
  if(rows[0].fromStage!==0)throw Error('Stamina rules must begin at fromStage 0.');
  for(let i=1;i<rows.length;i++)if(rows[i].fromStage<=rows[i-1].fromStage)throw Error('fromStage values must be unique and strictly increasing.');
  return rows;
 }
 function normalize(config={}){
  const explicit=Object.hasOwn(config,'stage')||Object.hasOwn(config,'staminaRules');
  const stage=integer(config.stage??1,1,'target stage'),rules=parseRules(config.staminaRules??defaultText);
  const index=rules.findLastIndex(r=>r.fromStage<=stage),selected=rules[index];
  return {stage,staminaRules:rules.map(r=>`${r.fromStage}:${r.staminaBonus}`).join(','),bonus:selected.staminaBonus,fromStage:selected.fromStage,nextFromStage:rules[index+1]?.fromStage??null,explicit};
 }
 function fields(config){const r=normalize(config);return r.explicit?{stage:r.stage,staminaRules:r.staminaRules}:{};}
 return Object.freeze({DEFAULT_BONUS,defaultRules,defaultText,parseRules,normalize,fields});
})();
globalThis.LabStaminaSettings=LabStaminaSettings;
