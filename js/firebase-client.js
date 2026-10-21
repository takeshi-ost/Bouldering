// Load after the local game has started. Network/SDK failures never gate TAP.
let firebaseBooting=false;
async function bootFirebase() {
    if(firebaseBooting || online.adapter)return;
    firebaseBooting=true;
    try {
        const [appSDK,authSDK,dbSDK]=await Promise.all([
            import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js'),
            import('https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js')
        ]);
        const app=appSDK.getApps().length?appSDK.getApp():appSDK.initializeApp({
            apiKey:'AIzaSyA6FVzBHfvc9hiFI4stgtEFjvtcbPxArFE',
            authDomain:'bouldering-7482d.firebaseapp.com',
            projectId:'bouldering-7482d',
            storageBucket:'bouldering-7482d.firebasestorage.app',
            messagingSenderId:'568607653816',
            appId:'1:568607653816:web:ee06affcbf8624f093194d'
        });
        const auth=authSDK.getAuth(app),db=dbSDK.getFirestore(app);
        const adapter={
            async authenticate() {
                // Require persistent identity; do not silently create a new guest each visit.
                await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);
                await auth.authStateReady();
                return auth.currentUser || (await authSDK.signInAnonymously(auth)).user;
            },
            async sync(uid,local,preferLocal) {
                const ref=dbSDK.doc(db,'players',uid);
                return dbSDK.runTransaction(db,async transaction=>{
                    const snapshot=await transaction.get(ref);
                    const remote=snapshot.exists()?onlineProfileFrom(snapshot.data()):null;
                    if(snapshot.exists() && !remote)throw new Error('Invalid saved profile');
                    const profile=mergeOnlineProfile(local,remote,preferLocal);
                    if(!remote || onlineProfileKey(profile)!==onlineProfileKey(remote))
                        transaction.set(ref,{...profile,updatedAt:dbSDK.serverTimestamp()});
                    return profile;
                });
            },
            async saveScore(uid,board,score) {
                const ref=dbSDK.doc(db,'stageScores',board,'entries',uid);
                return dbSDK.runTransaction(db,async transaction=>{
                    const snapshot=await transaction.get(ref),previous=snapshot.exists()?snapshot.data():null;
                    if(previous && !validStageScore(previous))throw new Error('Invalid stored score');
                    if(previous && compareStageScores(previous,score)<=0)return {moves:previous.moves,timeMs:previous.timeMs};
                    transaction.set(ref,{moves:score.moves,timeMs:score.timeMs,updatedAt:dbSDK.serverTimestamp()});
                    return score;
                });
            },
            async scores(uid,board) {
                const collection=dbSDK.collection(db,'stageScores',board,'entries');
                const query=dbSDK.query(collection,dbSDK.orderBy('moves'),dbSDK.orderBy('timeMs'),dbSDK.limit(100));
                const [snapshot,own]=await Promise.all([dbSDK.getDocs(query),dbSDK.getDoc(dbSDK.doc(collection,uid))]);
                const rows=snapshot.docs.map(doc=>({...doc.data(),id:doc.id}));
                if(own.exists() && !rows.some(row=>row.id===uid))rows.push({...own.data(),id:uid});
                const ids=rows.filter(row=>row.id!==uid).slice(0,5).map(row=>row.id);
                const profiles=await Promise.all(ids.map(id=>dbSDK.getDoc(dbSDK.doc(db,'players',id))));
                profiles.forEach((profile,i)=>{const row=rows.find(row=>row.id===ids[i]);row.profile=profile.exists()?profile.data():null;});
                return rows;
            },
            async players(first,last,mode) {
                const field=mode==='prototype'?'reachedPrototypeLevel':'reachedLevel',rows=[];
                let next=first;
                // Six includes our own profile, leaving up to five opponents at each level.
                // Four concurrent queries, once per page/minute, with single-field indexes.
                await Promise.all(Array.from({length:Math.min(4,last-first+1)},async()=>{
                    while(next<=last) {
                        const n=next++;
                        const query=dbSDK.query(dbSDK.collection(db,'players'),dbSDK.where(field,'==',n),dbSDK.limit(6));
                        const snapshot=await dbSDK.getDocs(query);
                        rows.push(...snapshot.docs.map(doc=>({...doc.data(),id:doc.id})));
                    }
                }));
                return rows;
            }
        };
        await startOnline(adapter);
    } catch(error) {
        setOnlineStatus('オフライン（端末内でプレイ）');
        console.warn('Firebase setup:',error?.code || error?.message || 'SDK unavailable');
    } finally {firebaseBooting=false;}
}
window.addEventListener('online',()=>{if(!online.adapter)void bootFirebase();});
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',bootFirebase,{once:true});
else void bootFirebase();
