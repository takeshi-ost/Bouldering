'use strict';
// Presentation only. "Online" means a verified existing service request has
// succeeded since the last failure/network transition, not just a restored UID.
let settingsConnectionVerified=false,settingsConnectionEpoch=0;
function refreshSettingsConnection() {
    const trial=!!globalThis.ASCENT_TRIAL;
    const disconnected=globalThis.navigator?.onLine===false;
    const native=globalThis.ASCENT_IOS_BUILD;
    const nativeDisabled=!!native && (native.firebaseEnabled!==true || !['read-only','auto-sync'].includes(native.firebaseMode) || !(native.firebaseReadsAllowed===true || native.firebaseAutomaticSyncAllowed===true));
    const connected=settingsConnectionVerified && !trial && !disconnected && !nativeDisabled;
    const value=document.getElementById('settingsConnectionValue');
    if(value)value.textContent=connected?gameText('settings.online'):gameText('settings.offline');
    // Use the running game release, not the wrapper's independent native build
    // metadata. This row is shared by every scene and is never a Debug control.
    const version=document.getElementById('settingsVersionValue');
    if(version)version.textContent=typeof RELEASE_VERSION==='string'?RELEASE_VERSION:'';
    return connected;
}
const settingsConnectionSignals=Object.freeze({
    ticket(){return settingsConnectionEpoch;},
    success(ticket=settingsConnectionEpoch){if(ticket!==settingsConnectionEpoch)return;settingsConnectionVerified=true;refreshSettingsConnection();},
    failure(){settingsConnectionEpoch++;settingsConnectionVerified=false;refreshSettingsConnection();}
});
Object.defineProperty(globalThis,'ASCENT_SETTINGS_CONNECTION',{value:settingsConnectionSignals,configurable:true});
// Going back online only permits existing retry flows to verify access. It is
// not itself evidence that Firebase is reachable or authorized.
window.addEventListener('offline',()=>settingsConnectionSignals.failure());
window.addEventListener('online',()=>settingsConnectionSignals.failure());
refreshSettingsConnection();
