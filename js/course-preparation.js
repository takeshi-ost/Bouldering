'use strict';
// Geometry-only, session-local preparation. Workers never receive player state.
const COURSE_PREPARATION_PROTOCOL=1;
const COURSE_PREPARATION_STARTUP_MS=15000;
let coursePreparationSerial=0;
const coursePreparationJobs=new Set();
function coursePreparationInteractive(){return typeof globalThis.document?.baseURI==='string';}
function coursePreparationError(code,message=code) {const error=new Error(message);error.code=code;return error;}
function coursePreparationText(kind) {
    if(kind==='loading')return gameText("course-preparation.loading");
    if(kind==='retry')return gameText("course-preparation.retry");
    return gameText("course-preparation.error");
}
function coursePreparationPortableSignature() {
    return JSON.stringify(adoptedCourseCacheInputs(),(_key,value)=>typeof value==='function'?String(value):value);
}
function coursePreparationRuntimeConfig() {
    const normalSeedOffset=CourseProgressionConfig.normalSeedOffset??0;
    if(!Number.isSafeInteger(normalSeedOffset)||normalSeedOffset<0||normalSeedOffset>4294967295)
        throw coursePreparationError('COURSE_PREPARATION_CONFIG');
    return {normalSeedOffset};
}
function coursePreparationIdentity(n,profile=null) {
    const request=adoptedCourseRequest(n,profile);
    if(!Number.isSafeInteger(n)||n<1||n>=Number.MAX_SAFE_INTEGER||
        (profile && (n!==(profile.kind==='score'?2:1)||profile.typeId!==generationTypeForScore(request.resolved.score))))
        throw coursePreparationError('COURSE_PREPARATION_REQUEST');
    return request;
}
function validatePreparedCourse(snapshot,request) {
    const fail=()=>{throw coursePreparationError('COURSE_PREPARATION_RESULT');};
    const keys=['holds','route','HEIGHT','initialGrips','densityStats','generatedCourse',
        'activeCourseGeneration','labSkeletonReport','labHeartsCache','labStaminaCache'];
    if(!snapshot || Object.keys(snapshot).sort().join()!==keys.sort().join())fail();
    // Structured-clone messages must contain bounded plain data, never an API,
    // typed payload, nonfinite geometry, or a hidden mutable live-state object.
    const seen=new Set();let count=0;
    const visit=value=>{
        if(value===null || typeof value==='string' || typeof value==='boolean' || typeof value==='undefined')return;
        if(typeof value==='number'){if(!Number.isFinite(value))fail();return;}
        if(typeof value!=='object'||(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype))fail();
        if(seen.has(value))return;seen.add(value);if(++count>250000)fail();
        for(const [key,item] of Object.entries(value)){
            if(['__proto__','constructor','prototype'].includes(key))fail();visit(item);
        }
    };visit(snapshot);
    const {holds:h,route:r,initialGrips:g,activeCourseGeneration:a,generatedCourse:c}=snapshot;
    const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
    if(!Array.isArray(h)||h.length<2||h.length>10000||!h.every(p=>point(p)&&Number.isSafeInteger(p.id)&&['start','normal','goal','hazard'].includes(p.type))||
        new Set(h.map(p=>p.id)).size!==h.length||!h.some(p=>p.type==='goal')||
        !Array.isArray(r)||!r.length||r.length>10000||!r.every(point)||
        !Array.isArray(g)||g.length!==4||!g.every(p=>h.includes(p))||
        !Number.isFinite(snapshot.HEIGHT)||snapshot.HEIGHT<=0||
        !a||!a.recipe||!a.retry||a.report!==snapshot.labSkeletonReport||
        !Number.isSafeInteger(a.initialStamina)||a.initialStamina<=0||
        a.initialStamina!==snapshot.labStaminaCache?.initialStamina||
        JSON.stringify(a.resolved)!==JSON.stringify(request.resolved))fail();
    // Generation-only sweep traces are not needed for an authenticated compact snapshot.
    const traceOmitted=snapshot.labSkeletonReport?.source==='precomputed'&&snapshot.labSkeletonReport.traceOmitted===true;
    const ids=new Set(h.map(p=>p.id));
    for(const [index,p] of r.entries()){
        if((index || p.grips) && (!Array.isArray(p.grips)||p.grips.length!==4||!p.grips.every(id=>ids.has(id))))fail();
        if(index && (!validFingerAction(p.action)||p.action.bodyMotion!==COUPLED_BODY_MODEL||p.action.gain!==fingerAimGain()||
            !Array.isArray(p.anchor)||p.anchor.length!==2||new Set(p.anchor).size!==2||!p.anchor.every(i=>Number.isInteger(i)&&i>=0&&i<4)||
            !(traceOmitted&&p.trace===undefined)&&(!Array.isArray(p.trace)||!p.trace.length||!p.trace.every(point))))fail();
    }
    const retry=a.retry;
    if(retry.version!==COURSE_RETRY_CONFIG.version||retry.initialSeed!==request.resolved.seed||
        !Number.isSafeInteger(retry.attempts)||retry.attempts<1||retry.attempts>COURSE_RETRY_CONFIG.maxAttempts||
        retry.maxAttempts!==COURSE_RETRY_CONFIG.maxAttempts||retry.geometrySeed!==((retry.initialSeed+retry.attempts-1)>>>0)||
        JSON.stringify(a.recipe)!==JSON.stringify({...request.sampled,seed:retry.geometrySeed}))fail();
    if(!c||c.holds!==h||c.level!==request.level||c.difficulty!==request.difficulty||c.typeId!==request.courseTypeId||
        c.seed!==request.resolved.seed||c.geometrySeed!==retry.geometrySeed||c.mode!=='existing'||
        c.generationRetryVersion!==retry.version||c.generationScore!==request.resolved.score||
        !Array.isArray(snapshot.labHeartsCache)||!Array.isArray(c.hearts))fail();
    return snapshot;
}
function assertPreparedCourse(lease,n,profile=null) {
    if(!lease || lease.cancelled || lease.signature!==refreshAdoptedCourseCacheDependencies()||
        JSON.stringify(lease.request)!==JSON.stringify(coursePreparationIdentity(n,profile)))
        throw coursePreparationError('COURSE_PREPARATION_STALE');
    return lease;
}
function withPreparedCourse(lease,n,profile,operation) {
    assertPreparedCourse(lease,n,profile);
    const previous=adoptedCourseLaunchLease;adoptedCourseLaunchLease=lease;
    try{return operation();}finally{adoptedCourseLaunchLease=previous;}
}
function restartPreparedCourse(lease,n,bonus=0,profile=null) {
    return withPreparedCourse(lease,n,profile,()=>restartInput(n,bonus));
}
function prepareCourseAsync(n,profile=null) {
    let request,signature;
    try {request=coursePreparationIdentity(n,profile);signature=refreshAdoptedCourseCacheDependencies();}
    catch(error){return {cancelled:false,cancel(){this.cancelled=true;},promise:Promise.reject(error)};}
    const key=adoptedCourseCacheKey(request,signature),requestId=++coursePreparationSerial;
    const job={requestId,request,signature,cancelled:false,snapshot:null,worker:null};
    let resolve,reject,settled=false,startupTimer=null;
    job.promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const settle=(error,snapshot)=>{
        if(settled)return;settled=true;
        if(startupTimer!==null)clearTimeout(startupTimer);startupTimer=null;
        job.worker?.terminate();job.worker=null;coursePreparationJobs.delete(job);
        if(error){reject(error);return;}
        job.snapshot=snapshot;resolve(job);
    };
    job.cancel=()=>{job.cancelled=true;settle(coursePreparationError('COURSE_PREPARATION_CANCELLED'));};
    coursePreparationJobs.add(job);
    const cached=key===null?null:adoptedCourseCache.get(key);
    if(cached){cacheAdoptedCourseSnapshot(key,cached);settle(null,cached);return job;}
    const generate=()=>{
    if(settled||job.cancelled)return;
    const build=globalThis.ASCENT_COURSE_BUILD;
    if(signature===null||typeof globalThis.Worker!=='function'||!build?.id){
        settle(coursePreparationError('COURSE_PREPARATION_UNAVAILABLE'));return job;
    }
    try {
        const portable=coursePreparationPortableSignature(),runtime=coursePreparationRuntimeConfig();
        const url=new URL('js/course-worker.js?v='+build.id,globalThis.document.baseURI);
        job.worker=new globalThis.Worker(url,{name:'ascent-course-preparation'});
        startupTimer=setTimeout(()=>settle(coursePreparationError('COURSE_PREPARATION_STARTUP_TIMEOUT')),COURSE_PREPARATION_STARTUP_MS);
        job.worker.onerror=()=>settle(coursePreparationError('COURSE_PREPARATION_WORKER'));
        job.worker.onmessageerror=()=>settle(coursePreparationError('COURSE_PREPARATION_MESSAGE'));
        job.worker.onmessage=event=>{
            if(settled||job.cancelled)return;
            try {
                const result=event.data;
                if(result?.type==='ready') {
                    if(job.ready || result.protocol!==COURSE_PREPARATION_PROTOCOL||result.buildId!==build.id)
                        throw coursePreparationError('COURSE_PREPARATION_MISMATCH');
                    job.ready=true;clearTimeout(startupTimer);startupTimer=null;
                    return;
                }
                if(!job.ready || !result||result.protocol!==COURSE_PREPARATION_PROTOCOL||result.requestId!==requestId||
                    result.buildId!==build.id||result.portable!==portable||JSON.stringify(result.runtime)!==JSON.stringify(runtime)||
                    JSON.stringify(result.request)!==JSON.stringify(request))
                    throw coursePreparationError('COURSE_PREPARATION_MISMATCH');
                assertPreparedCourse(job,n,profile);
                if(result.error)throw coursePreparationError('COURSE_PREPARATION_FAILED',result.error.message);
                const snapshot=freezeAdoptedCourse(validatePreparedCourse(result.snapshot,request));
                cacheAdoptedCourseSnapshot(key,snapshot);settle(null,snapshot);
            } catch(error){settle(error);}
        };
        job.worker.postMessage({protocol:COURSE_PREPARATION_PROTOCOL,buildId:build.id,requestId,request,portable,runtime});
    } catch(error){settle(error);}
    };
    const data=typeof courseData==='function'?courseData():null;
    if(data){
        data.lookup(request,snapshot=>validatePreparedCourse(snapshot,request),coursePreparationPortableSignature()).then(snapshot=>{
            if(settled||job.cancelled)return;
            if(!snapshot){generate();return;}
            try{assertPreparedCourse(job,n,profile);const frozen=freezeAdoptedCourse(snapshot);cacheAdoptedCourseSnapshot(key,frozen);settle(null,frozen);}catch(error){settle(error);}
        }).catch(()=>generate());
    }else generate();
    return job;
}

function launchPreparedCourseInput(lease,n,bonus=0,profile=null) {
    if(!lease && !coursePreparationInteractive())return restartInput(n,bonus);
    return restartPreparedCourse(lease,n,bonus,profile);
}
function setCoursePreparationStatus(id,text) {
    const element=typeof document!=='undefined'?document.getElementById(id):null;
    if(element){element.textContent=text;element.hidden=!text;}
}
