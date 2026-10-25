'use strict';
// Build a separate, offline-only bundle. Never modify the published Web sources.
const fs = require('node:fs');
const path = require('node:path');
const nativeSource = require('./native-bundle-source.cjs');
const buildNativeFirebase = require('./build-native-firebase.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
const firebaseMode=process.env.ASCENT_FIREBASE_MODE || 'offline';
if(!['offline','read-only','auto-sync'].includes(firebaseMode))throw Error('Unsupported native Firebase mode');
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(path.join(out, 'js'), {recursive: true});
for (const name of ['styles.css', 'assets']) {
    fs.cpSync(path.join(root, name), path.join(out, name), {recursive: true});
}
fs.mkdirSync(path.join(out,'assets/native'),{recursive:true});
fs.copyFileSync(path.join(root,'ios-assets/gym-floor-extended.png'),path.join(out,'assets/native/gym-floor-extended.png'));
for (const name of fs.readdirSync(path.join(root, 'js'))) {
    if (!name.endsWith('.js') || name === 'firebase-client.js') continue;
    fs.writeFileSync(path.join(out, 'js', name), nativeSource(name, fs.readFileSync(path.join(root, 'js', name), 'utf8')));
}
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const firebaseTag = /<script\s+type="module"\s+src="js\/firebase-client\.js(?:\?[^"\s]*)?"\s*><\/script>/g;
if ([...html.matchAll(firebaseTag)].length !== 1) {
    throw new Error('Expected one Firebase bootstrap tag; refusing an unverified native build');
}
html = html.replace(firebaseTag, firebaseMode==='offline'?'<script src="js/native-offline.js" defer></script>':'');
html = html.replace('    <!-- classic scripts', '    <script src="js/native-audio-fetch.js" defer></script>\n    <!-- classic scripts');
fs.copyFileSync(path.join(root, 'scripts/native-audio-fetch.js'), path.join(out, 'js/native-audio-fetch.js'));
fs.copyFileSync(path.join(root, 'scripts/native-stage-layout.js'), path.join(out, 'js/native-stage-layout.js'));
fs.copyFileSync(path.join(root, 'scripts/native-stage-layout.css'), path.join(out, 'native-stage-layout.css'));
fs.copyFileSync(path.join(root, 'scripts/native-audio-lifecycle.js'), path.join(out, 'js/native-audio-lifecycle.js'));
html = html.replace('</head>', '    <link rel="stylesheet" href="native-stage-layout.css">\n    <script src="js/native-stage-layout.js" defer></script>\n    <script src="js/native-audio-lifecycle.js" defer></script>\n</head>');
buildNativeFirebase(root,out,firebaseMode);
html = html.replace('<p id="onlineStatus"', '<p hidden id="onlineStatus"');
html = html.replace('</head>','    <script src="js/native-firebase-control.js" defer></script>\n</head>');
// Local media fetch stays available. Only explicitly enabled Firebase hosts may
// connect; external scripts, frames and form submissions always stay blocked.
const connections=firebaseMode!=='offline'?" https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com":'';
const policy = "default-src 'self'; script-src 'self'; connect-src 'self'"+connections+"; " +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "media-src 'self' data: blob:; font-src 'self' data:; " +
    "object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
html = html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}">`);
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, 'js/native-offline.js'), `'use strict';
// The bundled SDK is dormant in offline mode; no Firebase instance is initialized.
globalThis.ASCENT_NATIVE_OFFLINE = true;
const nativeOfflineLabel = 'iOS local · オフライン検証 / Offline test';
setOnlineStatus(nativeOfflineLabel);
ui.playerUuid.textContent = nativeOfflineLabel;
`);
console.log('Built iOS assets: Firebase '+firebaseMode+'; external scripts and frames blocked');
