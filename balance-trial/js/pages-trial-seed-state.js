'use strict';
// Artifact-only preference state. Loaded before any application source.
(() => {
    const key='ascent.trial-seed-offset.v1';
    const valid=n=>Number.isInteger(n)&&n>=0&&n<=4294967295;
    function parse(raw) {
        if(typeof raw!=='string' || !/^[0-9]+$/.test(raw.trim()))return null;
        const n=Number(raw.trim());return valid(n)?n:null;
    }
    function identity(n) {
        if(!valid(n))throw new RangeError('Invalid trial seed offset');
        return n===0?'trial-d6-0.4.12':'trial-d7-offset'+n;
    }
    function supported(version) {
        if(version==='trial-d6-0.4.12')return true;
        if(typeof version!=='string' || !/^trial-d7-offset[1-9][0-9]*$/.test(version))return false;
        const n=parse(version.slice('trial-d7-offset'.length));
        return n!==null && identity(n)===version;
    }
    let offset=ASCENT_TRIAL.normalSeedOffset;
    try {const saved=parse(ASCENT_TRIAL_STORAGE.getItem(key));if(saved!==null)offset=saved;}catch(_) {}
    function persist(n) {
        if(!valid(n))return false;
        offset=n;
        try {ASCENT_TRIAL_STORAGE.setItem(key,String(n));return true;}catch(_) {return false;}
    }
    Object.defineProperty(globalThis,'ASCENT_TRIAL_SEEDS',{value:Object.freeze({parse,identity,supported,persist,get offset(){return offset;}}),writable:false,configurable:false});
})();
