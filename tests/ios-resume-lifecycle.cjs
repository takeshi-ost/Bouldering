'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'ios/App/App/SceneDelegate.swift'), 'utf8');
const section = (start, end) => {
    const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
    assert(from >= 0 && to > from, `Missing native section ${start}`);
    return source.slice(from, to);
};
const policy = section('private final class NativeResumeState', '// END native resume policy.');
assert.match(policy, /backgroundLimit: TimeInterval = 300/);
assert.match(policy, /now - started >= Self\.backgroundLimit/);
assert.match(policy, /guard next\["backgroundAt"\] == nil else \{ return \}/);
assert.match(policy, /guard pendingID == id else \{ return false \}/);
assert.match(policy, /defaults\.set\(next, forKey: key\)/);
assert.doesNotMatch(section('func acknowledge(', '// END native resume policy.'), /removeValue\(forKey: "backgroundAt"\)/);

const inactive = section('func sceneWillResignActive(', 'func sceneDidEnterBackground(');
assert.match(inactive, /notifyAudioLifecycle\(false\)/);
assert.doesNotMatch(inactive, /enteredBackground|prepareForActivation/);
const background = section('func sceneDidEnterBackground(', 'func sceneDidBecomeActive(');
assert.match(background, /NativeResumeState\.shared\.enteredBackground\(\)/);
const active = section('func sceneDidBecomeActive(', 'func scene(_ scene: UIScene, willConnectTo');
assert(active.indexOf('prepareForActivation()') < active.indexOf('resumeAfterLongBackground(id: id)'));
assert.match(active, /if controller\.resumeInteractionReady \{ notifyAudioLifecycle\(true\) \}/);
const cold = section('func scene(_ scene: UIScene, willConnectTo', 'func scene(_ scene: UIScene, openURLContexts');
assert(cold.indexOf('prepareForActivation()') < cold.indexOf('AscentBridgeViewController()'));
assert.match(cold, /activationState == \.foregroundActive/);

const bridge = section('private final class ResumeMessageHandler', 'class AscentBridgeViewController');
assert.match(bridge, /message\.frameInfo\.isMainFrame/);
assert.match(bridge, /message\.webView === owner\?\.webView/);
const installed = section('private func installResumeUserScript()', 'fileprivate func resumeAfterLongBackground(');
assert.match(installed, /injectionTime: \.atDocumentStart, forMainFrameOnly: true/);
assert.match(installed, /content\.userScripts\.filter \{ \$0 !== previous \}/);
assert.match(installed, /for existing in retained \{ content\.addUserScript\(existing\) \}/);
assert.match(installed, /"id": NSNull\(\), "reason": NSNull\(\)/);
const literal = installed.match(/let source = "(Object\.defineProperty\(globalThis, 'ASCENT_IOS_RESUME'.*?)"\n/)[1];
for (const id of [null, '647BF5F7-476E-46BD-80BE-4B9E08522696']) {
    const context = vm.createContext({});
    vm.runInContext(literal.replace('\\(json)', JSON.stringify({id, reason:id ? 'long-background' : null})), context);
    const value = vm.runInContext('ASCENT_IOS_RESUME', context);
    assert.equal(value.id, id);
    assert.equal(value.reason, id ? 'long-background' : null);
    assert.equal(vm.runInContext('Object.isFrozen(ASCENT_IOS_RESUME)', context), true);
    assert.equal(vm.runInContext("Object.getOwnPropertyDescriptor(globalThis,'ASCENT_IOS_RESUME').writable", context), false);
    assert.equal(vm.runInContext("Object.getOwnPropertyDescriptor(globalThis,'ASCENT_IOS_RESUME').configurable", context), false);
}
const repeated = section('fileprivate func resumeAfterLongBackground(', 'private func reloadResumeDocument()');
assert.match(repeated, /guard resumeDocumentID != id else \{ return \}/);
const reload = section('private func reloadResumeDocument()', 'fileprivate func receiveResumeMessage(');
assert(reload.indexOf('isUserInteractionEnabled = false') < reload.indexOf('webView?.reload()'));
assert(reload.indexOf('installResumeUserScript()') < reload.indexOf('webView?.reload()'));
assert.doesNotMatch(reload, /ascent-native-resume|notifyAudioLifecycle\(true\)/);
const blocked = section('if kind == "blocked"', 'guard kind == "ready"');
const received = section('fileprivate func receiveResumeMessage(', 'if kind == "blocked"');
assert.match(received, /guard id == resumeDocumentID else \{ return \}/, 'Both blocked and ready require the current document ID');
assert.match(blocked, /isUserInteractionEnabled = false/);
assert.match(blocked, /locale == "ja" \|\| locale == "en"/);
assert.doesNotMatch(blocked, /acknowledge|removeValue|isUserInteractionEnabled = true/);
const ready = section('guard kind == "ready"', 'private func armResumeWatchdog()');
assert.match(ready, /!resumeInteractionReady/);
assert.match(ready, /guard id == pending, NativeResumeState\.shared\.acknowledge\(pending\)/);
assert.match(ready, /guard id == nil \|\| resumeDocumentAcknowledged else \{ return \}/);
assert(ready.indexOf('acknowledge(pending)') < ready.indexOf('isUserInteractionEnabled = true'));
const retry = section('private func retryResume(', 'private func safeViewportGeometry()');
assert.match(retry, /globalThis\.ASCENT_NATIVE_RESUME\?\.retry/);
assert.match(retry, /globalThis\.ASCENT_NATIVE_RESUME\.retry\(\)/);
assert.match(retry, /error != nil \|\| \(result as\? Bool\) != true.*resumeRetryMode = \.reload/);
const watchdog = section('private func armResumeWatchdog()', 'fileprivate func presentResumeRetryIfNeeded()');
assert.match(watchdog, /resumeRetryMode = \.reload/);
assert.doesNotMatch(watchdog, /reloadResumeDocument\(\)|webView\?\.reload\(\)/, 'The watchdog offers a retry, never auto-reloads');
const boot = section('override func capacitorDidLoad()', 'let configuration = Bundle.main');
assert.match(boot, /isUserInteractionEnabled = false/);
assert.match(boot, /ResumeMessageHandler\(self\), name: "ascentResume"/);
assert.match(boot, /installResumeUserScript\(\)/);
// Existing isolation boundaries still exist after installing the new bridge.
for (const name of ['ASCENT_IOS_BUILD', 'ASCENT_NATIVE_SAFE_AREA', 'ascentViewport', 'ASCENT_AUDIO_DIAGNOSTICS', 'ascentFirebaseReport']) assert(source.includes(name));
console.log('PASS native resume static contracts and executed immutable document-start script');

// Run the production policy, not a JavaScript rewrite, when a Swift toolchain is
// available (e.g. macOS CI). Linux without Swift reports the missing coverage.
const swift = spawnSync('swift', ['--version'], {encoding:'utf8'});
if (swift.error?.code === 'ENOENT') {
    console.log('SKIP production Swift policy execution: Swift toolchain is unavailable; no UIKit/Xcode build was run');
} else {
    assert.equal(swift.status, 0, swift.stderr);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ascent-native-resume-'));
    try {
        const file = path.join(directory, 'policy.swift');
        fs.writeFileSync(file, 'import Foundation\n' + policy + '\n' + fs.readFileSync(path.join(__dirname, 'ios-resume-native-policy.swift'), 'utf8'));
        const result = spawnSync('swift', [file], {encoding:'utf8', timeout:60000});
        assert.equal(result.status, 0, result.stderr || result.error?.message);
        process.stdout.write(result.stdout);
    } finally { fs.rmSync(directory, {recursive:true, force:true}); }
}
