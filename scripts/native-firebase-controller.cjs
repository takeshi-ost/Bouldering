'use strict';
const {scoreMetadata}=require('../js/score-metadata.js');
const PROJECT='bouldering-7482d';
const ATTEMPT_KEY='ascent.native-firebase.auth-attempt.v1';
const IDENTITY_KEY='ascent.native-firebase.identity-check.v1';
function createNativeFirebaseController({policy,mode,config,loadSDK,storage,knownUid=()=>null,onReport=()=>{}}) {
    let sdkPromise,authPromise,app,auth,db;
    const report={phase:'offline',authenticated:false,restored:false,createdThisRun:0,sameIdentity:false,readQueries:0,mapDocuments:0,scoreDocuments:0,blockedWrites:0,writesIssued:0,lastError:''};
    const publish=()=>onReport(Object.freeze({...report}));
    const error=code=>Object.assign(new Error(code),{code});
    function permissions() {
        const p=policy();
        const network=['read-only','auto-sync'].includes(mode) && p?.firebaseMode===mode && p?.firebaseEnabled===true;
        return Object.freeze({network,auth:network && p.firebaseAuthAllowed===true,
            create:network && mode==='read-only' && p.firebaseAnonymousAllowed===true,read:network && p.firebaseReadsAllowed===true,
            automaticSync:network && mode==='auto-sync' && p.firebaseAutomaticSyncAllowed===true,
            profileWrites:false,scoreWrites:false,pendingScores:false,transfer:false,deletion:false,legacySync:false});
    }
    function requirePermission(name) {if(!permissions()[name])throw error('native-firebase/'+name+'-disabled');}
    function fail(e) {
        let code=e?.code||'';
        if(['permission-denied','unauthenticated','unavailable','failed-precondition','resource-exhausted','deadline-exceeded','aborted','cancelled','invalid-argument'].includes(code))code='firestore/'+code;
        report.phase='failed';report.lastError=/^(auth|firestore|native-firebase)\/[a-z0-9-]+$/.test(code)?code:'native-firebase/unavailable';publish();
        return error(report.lastError);
    }
    function checkStorage() {
        const key=ATTEMPT_KEY+'.probe';
        try {
            if(!storage || storage.getItem(key)!==null)throw error('native-firebase/persistence-unavailable');
            storage.setItem(key,'probe');if(storage.getItem(key)!=='probe')throw error('native-firebase/persistence-unavailable');
            storage.removeItem(key);
        } catch(_) {throw error('native-firebase/persistence-unavailable');}
    }
    async function sdk() {
        requirePermission('auth');
        if(config?.projectId!==PROJECT)throw error('native-firebase/config-mismatch');
        sdkPromise ||= Promise.resolve().then(loadSDK);
        return sdkPromise;
    }
    function authenticate({createAnonymous=false}={}) {
        try {requirePermission('auth');}catch(e){return Promise.reject(e);}
        if(authPromise)return authPromise;
        authPromise=(async()=>{
            checkStorage();
            const s=await sdk();requirePermission('auth');
            app ||= s.app.getApps().length?s.app.getApp():s.app.initializeApp(config);
            if(app.options?.projectId && app.options.projectId!==PROJECT)throw error('native-firebase/config-mismatch');
            auth ||= s.auth.initializeAuth(app,{persistence:s.auth.browserLocalPersistence});
            await s.auth.setPersistence(auth,s.auth.browserLocalPersistence);
            await auth.authStateReady();requirePermission('auth');
            const known=knownUid() || storage.getItem(IDENTITY_KEY);let user=auth.currentUser;
            if(user) {
                if(known && known!==user.uid)throw error('native-firebase/identity-mismatch');
                report.restored=true;
            } else {
                if(known)throw error('native-firebase/identity-restore-required');
                if(!createAnonymous)throw error('native-firebase/auth-required');
                requirePermission('create');
                if(storage.getItem(ATTEMPT_KEY)!==null)throw error('native-firebase/creation-already-attempted');
                // Durable marker before the request: even an uncertain network
                // result cannot cause repeated anonymous creation after relaunch.
                storage.setItem(ATTEMPT_KEY,'started');
                if(storage.getItem(ATTEMPT_KEY)!=='started')throw error('native-firebase/persistence-unavailable');
                requirePermission('create');
                user=(await s.auth.signInAnonymously(auth)).user;
                if(!user?.uid)throw error('native-firebase/identity-unavailable');
                report.createdThisRun=1;storage.setItem(ATTEMPT_KEY,'completed');
            }
            const previous=storage.getItem(IDENTITY_KEY);
            report.sameIdentity=previous!==null && previous===user.uid;
            storage.setItem(IDENTITY_KEY,user.uid);
            report.authenticated=true;report.phase='authenticated';report.lastError='';publish();
            return Object.freeze({uid:user.uid});
        })().catch(e=>{const safe=fail(e);if(mode==='auto-sync' && safe.code==='auth/network-request-failed')authPromise=null;throw safe;});
        return authPromise;
    }
    async function database() {
        requirePermission('read');await authenticate();requirePermission('read');
        const s=await sdk();db ||= s.firestore.getFirestore(app);return s.firestore;
    }
    async function getProfile(uid) {
        const f=await database();requirePermission('read');report.readQueries++;
        const snap=await f.getDocFromServer(f.doc(db,'players',uid));publish();return snap.exists()?snap.data():null;
    }
    async function players(first,last,modeName) {
        if(!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first<1 || last<first || last-first>=20 || !['existing','prototype'].includes(modeName))throw error('native-firebase/invalid-query');
        const f=await database(),field=modeName==='prototype'?'reachedPrototypeLevel':'reachedLevel',rows=[];
        for(let n=first;n<=last;n++) {
            requirePermission('read');report.readQueries++;
            const snap=await f.getDocsFromServer(f.query(f.collection(db,'players'),f.where(field,'==',n),f.limit(6)));
            rows.push(...snap.docs.map(doc=>({...doc.data(),id:doc.id})));
        }
        report.mapDocuments+=rows.length;report.phase='reading';publish();return rows;
    }
    async function scores(uid,board) {
        requirePermission('read');
        if(!/^v1_(existing|prototype)_[1-9][0-9]{0,5}$/.test(board))throw error('native-firebase/invalid-board');
        const user=await authenticate();if(user.uid!==uid)throw error('native-firebase/identity-mismatch');
        const f=await database();requirePermission('read');
        const collection=f.collection(db,'stageScores',board,'entries');report.readQueries+=2;
        const [snapshot,own]=await Promise.all([
            f.getDocsFromServer(f.query(collection,f.orderBy('moves'),f.orderBy('timeMs'),f.limit(100))),
            f.getDocFromServer(f.doc(collection,uid))]);
        const rows=snapshot.docs.map(doc=>({...doc.data(),id:doc.id}));
        if(own.exists() && !rows.some(row=>row.id===uid))rows.push({...own.data(),id:uid});
        for(const row of rows.filter(row=>row.id!==uid).slice(0,5))row.profile=await getProfile(row.id);
        report.scoreDocuments+=rows.length;report.phase='ready';publish();return rows;
    }
    function validProfile(p) {
        const color=x=>typeof x==='string' && /^#[0-9a-fA-F]{6}$/.test(x);
        return p && typeof p.name==='string' && p.name.trim().length>0 && Array.from(p.name).length<=40 && Array.isArray(p.colors) && p.colors.length>=1 && p.colors.length<=8 && p.colors.every(color) && color(p.headColor) && [p.reachedLevel,p.reachedPrototypeLevel].every(n=>Number.isSafeInteger(n) && n>=1 && n<=1000000);
    }
    async function syncAutomaticProfile(owner,profile) {
        requirePermission('automaticSync');
        const user=await authenticate();if(user.uid!==owner)throw error('native-firebase/identity-mismatch');
        if(!validProfile(profile))throw error('native-firebase/invalid-profile');
        const f=await database(),ref=f.doc(db,'players',owner);
        const result=await f.runTransaction(db,async t=>{
            const snapshot=await t.get(ref),remote=snapshot.exists()?snapshot.data():null;
            if(remote && !validProfile(remote))throw error('native-firebase/invalid-remote-profile');
            const next={name:profile.name,colors:[...profile.colors],headColor:profile.headColor,
                reachedLevel:Math.max(profile.reachedLevel,remote?.reachedLevel||1),reachedPrototypeLevel:Math.max(profile.reachedPrototypeLevel,remote?.reachedPrototypeLevel||1)};
            if(remote && Object.entries(next).every(([k,v])=>JSON.stringify(remote[k])===JSON.stringify(v)))return {written:false};
            requirePermission('automaticSync');if(auth.currentUser?.uid!==owner)throw error('native-firebase/identity-mismatch');
            t.set(ref,{...next,updatedAt:f.serverTimestamp()});return {written:true};
        });
        if(result.written){report.writesIssued++;report.profileUpdates=(report.profileUpdates||0)+1;}report.lastError='';report.phase='synced';publish();return result;
    }
    async function syncFreshScore(owner,board,score) {
        requirePermission('automaticSync');
        const user=await authenticate();if(user.uid!==owner)throw error('native-firebase/identity-mismatch');
        if(!/^v1_(existing|prototype)_[1-9][0-9]{0,5}$/.test(board) || !Number.isSafeInteger(score?.moves) || score.moves<1 || score.moves>1000000 || !Number.isSafeInteger(score.timeMs) || score.timeMs<0 || score.timeMs>604800000)throw error('native-firebase/invalid-score');
        const f=await database(),ref=f.doc(db,'stageScores',board,'entries',owner);
        const result=await f.runTransaction(db,async t=>{
            const snapshot=await t.get(ref),previous=snapshot.exists()?snapshot.data():null;
            if(previous && (!Number.isSafeInteger(previous.moves) || !Number.isSafeInteger(previous.timeMs)))throw error('native-firebase/invalid-remote-score');
            if(previous && (previous.moves<score.moves || (previous.moves===score.moves && previous.timeMs<=score.timeMs)))return {written:false};
            requirePermission('automaticSync');if(auth.currentUser?.uid!==owner)throw error('native-firebase/identity-mismatch');
            t.set(ref,{moves:score.moves,timeMs:score.timeMs,...scoreMetadata(score),updatedAt:f.serverTimestamp()});return {written:true};
        });
        if(result.written){report.writesIssued++;report.freshScoreWrites=(report.freshScoreWrites||0)+1;}report.lastError='';report.phase='synced';publish();return result;
    }
    const deny=()=>{report.blockedWrites++;publish();return Promise.reject(error('native-firebase/write-disabled'));};
    const safePlayers=(...args)=>players(...args).catch(e=>{throw fail(e);});
    const safeScores=(...args)=>scores(...args).catch(e=>{throw fail(e);});
    const safeProfile=(...args)=>getProfile(...args).catch(e=>{throw fail(e);});
    const adapter=Object.freeze({authenticate:()=>authenticate(),players:safePlayers,scores:safeScores,sync:deny,saveScore:deny,
        prepareTransferIdentity:deny,importTransferIdentity:deny,lockDeletion:deny,deleteAccount:deny});
    publish();
    return Object.freeze({permissions,authenticate,syncAutomaticProfile:(...a)=>syncAutomaticProfile(...a).catch(e=>{throw fail(e);}),syncFreshScore:(...a)=>syncFreshScore(...a).catch(e=>{throw fail(e);}),players:safePlayers,scores:safeScores,getProfile:safeProfile,adapter:()=>adapter,report:()=>Object.freeze({...report})});
}
module.exports={createNativeFirebaseController,ATTEMPT_KEY,IDENTITY_KEY};
