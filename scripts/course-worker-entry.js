'use strict';
// This endpoint accepts course identities only, not user/account/run state.
globalThis.onmessage=event=>{
    const input=event.data;
    const response={protocol:COURSE_PREPARATION_PROTOCOL,buildId:globalThis.ASCENT_COURSE_BUILD.id,
        requestId:input?.requestId,request:null,portable:null,runtime:null};
    try {
        if(!input||Object.keys(input).sort().join()!==['protocol','buildId','requestId','request','portable','runtime'].sort().join()||
            input.protocol!==COURSE_PREPARATION_PROTOCOL||input.buildId!==response.buildId||
            !Number.isSafeInteger(input.requestId)||input.requestId<1)
            throw coursePreparationError('COURSE_PREPARATION_REQUEST');
        if(!input.runtime||Object.keys(input.runtime).join()!=='normalSeedOffset'||
            !Number.isSafeInteger(input.runtime.normalSeedOffset)||input.runtime.normalSeedOffset<0||input.runtime.normalSeedOffset>4294967295)
            throw coursePreparationError('COURSE_PREPARATION_CONFIG');
        CourseProgressionConfig.normalSeedOffset=input.runtime.normalSeedOffset;
        response.runtime=coursePreparationRuntimeConfig();response.portable=coursePreparationPortableSignature();
        if(input.portable!==response.portable)throw coursePreparationError('COURSE_PREPARATION_CONFIG');
        const requested=input.request;
        const resolved=requested.date?CourseProgression.resolveDaily(requested.date):CourseProgression.resolveStage(requested.level);
        const profile=requested.date?{date:requested.date,typeId:generationTypeForScore(resolved.score)}:null;
        const request=coursePreparationIdentity(requested.level,profile);response.request=request;
        if(JSON.stringify(request)!==JSON.stringify(requested))throw coursePreparationError('COURSE_PREPARATION_REQUEST');
        level=request.level;difficulty=request.difficulty;courseTypeId=request.courseTypeId;
        courseMode='existing';dailyRun=profile;tutorialRun=null;debugCourseTrial=null;
        prepareAdoptedCourse();
        response.snapshot=validatePreparedCourse(adoptedCourseSnapshot(),request);
    } catch(error){response.error={code:error?.code||'COURSE_PREPARATION_FAILED',message:String(error?.message||error)};}
    globalThis.postMessage(response);
};

// Report startup separately from potentially long, bounded course searches.
globalThis.postMessage({type:'ready',protocol:COURSE_PREPARATION_PROTOCOL,buildId:globalThis.ASCENT_COURSE_BUILD.id});
