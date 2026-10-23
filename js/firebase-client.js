// Load after the local game has started. Network/SDK failures never gate TAP.
let firebaseBooting=false;
async function bootFirebase() {
    if(accountDeletion.marker?.phase==='done'){showDeleteUserDialog();return;}
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
            async authenticate(create=true) {
                // Require persistent identity; do not silently create a new guest each visit.
                await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);
                await auth.authStateReady();
                return auth.currentUser || (create?(await authSDK.signInAnonymously(auth)).user:null);
            },
            async prepareTransferIdentity(identity) {
                const user=auth.currentUser;
                if(!user || user.uid!==identity.uid)throw new Error('UIDを確認できません。再読み込みしてください。');
                const credential=authSDK.EmailAuthProvider.credential(identity.email,identity.password);
                const linked=user.providerData?.some(provider=>provider.providerId==='password');
                const result=linked?await authSDK.reauthenticateWithCredential(user,credential):await authSDK.linkWithCredential(user,credential);
                if(result.user.uid!==identity.uid)throw new Error('引き継ぎ情報のUIDが一致しません。');
            },
            async importTransferIdentity(identity,apply) {
                const previous=auth.currentUser;
                await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);
                try {
                    const result=await authSDK.signInWithEmailAndPassword(auth,identity.email,identity.password);
                    if(result.user.uid!==identity.uid)throw new Error('ファイルのUIDと認証情報が一致しません。');
                    if(await adapter.isDeletionLocked(identity.uid))throw new Error('削除済みユーザーのデータは引き継げません。');
                    await apply();
                } catch(error) {
                    // Never leave the previous local save signed into a different UID.
                    if(auth.currentUser!==previous)await authSDK.updateCurrentUser(auth,previous);
                    throw error;
                }
            },
            async isDeletionLocked(uid) {
                try {return (await dbSDK.getDocFromServer(dbSDK.doc(db,'accountDeletionLocks',uid))).exists();}
                catch(error) {
                    // Older published rules have no lock reads. Keep normal play working;
                    // deletion itself still requires the new lock/write/delete permissions.
                    if(error.code==='permission-denied')return false;
                    throw error;
                }
            },
            async lockDeletion(uid) {
                if(auth.currentUser?.uid!==uid)throw new Error('Authentication does not match deletion target');
                const ref=dbSDK.doc(db,'accountDeletionLocks',uid);
                await dbSDK.runTransaction(db,async transaction=>{
                    if(!(await transaction.get(ref)).exists())transaction.set(ref,{requestedAt:dbSDK.serverTimestamp()});
                });
            },
            async deleteAccount(uid,onProgress) {
                if(auth.currentUser?.uid!==uid)throw new Error('Authentication does not match deletion target');
                const identity=typeof readTransferIdentity==='function'?readTransferIdentity():null;
                if(identity?.uid===uid && auth.currentUser.providerData?.some(provider=>provider.providerId==='password'))
                    await authSDK.reauthenticateWithCredential(auth.currentUser,authSDK.EmailAuthProvider.credential(identity.email,identity.password));
                // Debug cleanup includes legacy scores without an owner field, all versions.
                // Public score entries are scanned in bounded pages; only our UID is deleted.
                let cursor=null,removed=0;
                while(true) {
                    const options=[dbSDK.limit(100)]; // Default document-path ordering, no field filter.
                    if(cursor)options.push(dbSDK.startAfter(cursor));
                    const page=await dbSDK.getDocsFromServer(dbSDK.query(dbSDK.collectionGroup(db,'entries'),...options));
                    const own=page.docs.filter(doc=>/^stageScores\/[^/]+\/entries\/[^/]+$/.test(doc.ref.path) && doc.id===uid);
                    if(own.length) {
                        const batch=dbSDK.writeBatch(db);own.forEach(doc=>batch.delete(doc.ref));await batch.commit();removed+=own.length;
                    }
                    onProgress?.(removed);
                    if(page.docs.length<100)break;
                    cursor=page.docs.at(-1);
                }
                await dbSDK.deleteDoc(dbSDK.doc(db,'players',uid));
                // Keep authentication until every Firestore deletion has been acknowledged.
                await authSDK.deleteUser(auth.currentUser);
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
