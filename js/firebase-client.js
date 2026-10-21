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
