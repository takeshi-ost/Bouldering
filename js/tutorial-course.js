'use strict';
// Authored, isolated STAGE 0. No normal/Daily generator or RNG is changed.
const TUTORIAL_COURSE_CONFIG=Object.freeze({version:'2',seed:0,height:700,centerHoldId:null,extraStamina:5});
function tutorialCourseHolds(){
    return [
        {x:130,y:650,type:'start'},{x:270,y:650,type:'start'},
        {x:200,y:492,type:'start',wide:true},
        // Ordinary holds alternate sides in a single ascending sequence.
        {x:150,y:460,type:'normal'},{x:250,y:420,type:'normal'},
        {x:150,y:380,type:'normal'},{x:250,y:340,type:'normal'},
        {x:150,y:300,type:'normal'},{x:250,y:260,type:'normal'},
        {x:150,y:220,type:'normal'},{x:250,y:180,type:'normal'},
        {x:150,y:140,type:'normal'},
        {x:208,y:40,type:'goal'}
    ].map((hold,id)=>({...hold,id,row:null}));
}
// Fixed authored explicit gestures for the formal 1.5× limb aiming controls.
// Both support-constrained body motion and live sampled input are replayed.
function tutorialFingerAuthoredRoute(){
    return [{"x":200,"y":560},
        {"x":193.3872215243139,"y":519.6867277989843,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":-30,"dy":-90}]}},
        {"x":190.77477265772333,"y":398.18175619538084,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":-2.0744142640695316,"dy":-126.2232427922086}]}},
        {"x":200,"y":347.8334617360803,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":-3.943744368834026,"dy":-239.9675954797924}]}},
        {"x":241.8628735511183,"y":196.70613195614658,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":50.05366258171523,"dy":-196.73475775884248}]}},
        {"x":199.99451552612794,"y":160.6043552443149,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":0,"dy":-240}]}},
        {"x":192.1399228197822,"y":156.25110758094036,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":-8.265306415753429,"dy":-31.088151245082557}]}}];
}
function prepareTutorialCourse(){
    const previous={holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,
        hearts,labSkeletonReport,labHeartsCache,labStaminaCache,committed,startGrips,moveCount};
    try{
        if(W!==400||H!==700)throw Error('Tutorial authored dimensions require review.');
        holds=tutorialCourseHolds();HEIGHT=TUTORIAL_COURSE_CONFIG.height;
        initialGrips=[holds[2],holds[2],holds[0],holds[1]];
        // Mark dedicated mode before replay: real STAGE 0 must not inherit the
        // legacy non-stage-1 traverse constraint. No level/difficulty mutation.
        activeCourseGeneration={tutorial:true,initialStamina:0};
        // Authored offline, then verified with the exact live contact solver.
        // No generation/search, RNG, or fallback is used at runtime.
        const authored=[{x:200,y:560},{x:200,y:540},{x:170,y:450},
            {x:185,y:355},{x:195,y:265},{x:225,y:220},{x:205,y:185},
            {x:265,y:140},{x:235,y:155}];
        const fingerInput=typeof fingerAimEnabled==='function'&&fingerAimEnabled();
        if(fingerInput&&fingerAimGain()!==1.5)throw Error('Tutorial authored input witness requires gain 1.5.');
        const witness=fingerInput?tutorialFingerAuthoredRoute():authored;
        if(fingerInput&&coupledBodyEnabled())for(const p of witness)if(p.action)p.action.bodyMotion=COUPLED_BODY_MODEL;
        route=replayRoute(witness);
        if(!route || route.length!==witness.length)
            throw Error('Tutorial authored route no longer replays.');
        if(fingerInput&&!fingerValidateDragReference(route).valid)throw Error('Tutorial finger drag witness no longer replays.');
        const referenceMoves=routeExpectedMoves(route),normalStamina=stageStamina(referenceMoves);
        const initialStamina=normalStamina+TUTORIAL_COURSE_CONFIG.extraStamina;
        const resources=routeResources(route,{pickups:[],budget:initialStamina});
        if(!resources.valid || resources.pickups || resources.penalties)
            throw Error('Tutorial authored route exceeds its stamina budget.');
        const report={version:TUTORIAL_COURSE_CONFIG.version,seed:TUTORIAL_COURSE_CONFIG.seed,
            type:'straight',length:'short',height:HEIGHT,centerHoldId:TUTORIAL_COURSE_CONFIG.centerHoldId,
            referenceMoves,normalStamina,extraStamina:TUTORIAL_COURSE_CONFIG.extraStamina,initialStamina,
            hearts:0,spikes:0,resources,validated:true,...(fingerInput?{inputModel:'finger-origin-v1',gain:1.5,...(coupledBodyEnabled()?{bodyMotion:COUPLED_BODY_MODEL}:{})}: {})};
        generatedCourse={level:0,seed:TUTORIAL_COURSE_CONFIG.seed,difficulty:0,typeId:0,mode:'tutorial',
            holds,intent:'basic',hearts:[],hazardPlacement:{routeIds:[],optionalIds:[]}};
        activeCourseGeneration={tutorial:true,report,initialStamina};
        hearts=[];labHeartsCache=[];labStaminaCache=null;labSkeletonReport=null;
        densityStats={total:holds.length,coreCount:holds.length,branchCount:0,peak:holds.length,
            fixedSupports:2,routeBudgetValidated:true,hazardCount:0,tutorial:true};
        return report;
    }catch(error){
        ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,
            hearts,labSkeletonReport,labHeartsCache,labStaminaCache,committed,startGrips,moveCount}=previous);
        throw error;
    }
}
