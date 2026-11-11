'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('.github/workflows/ios-simulator.yml');
assert.match(source,/branches: \[feature\/formal-integration, feature\/coupled-production-integration\]/);
assert(!read('.github/workflows/pages.yml').includes('coupled-production-integration'),'Integration CI must not deploy Pages');
assert.match(source,/permissions:\s*\n  contents: read/);
assert.match(source,/if: \$\{\{ github\.event\.repository\.private == false \}\}/);
assert.match(source,/runs-on: macos-15\s*\n/);
assert.match(source,/timeout-minutes: 20/);
assert.match(source,/persist-credentials: false/);
assert.match(source,/package-manager-cache: false/);
assert.match(source,/DEVELOPER_DIR: \/Applications\/Xcode_26\.2\.app\/Contents\/Developer/);
assert.match(source,/ASCENT_FIREBASE_MODE: offline/);
assert.match(source,/npm ci --ignore-scripts --no-audit --no-fund/);
assert.match(source,/\.\/node_modules\/\.bin\/cap copy ios/);
assert.match(source,/for configuration in Debug Release/);
assert.match(source,/-destination 'generic\/platform=iOS Simulator'/);
assert.match(source,/CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=/);
assert.match(source,/node tests\/ios-assets\.cjs --built/);
// --built intentionally skips source-only recovery suites. The copy check must
// run the complete default verifier first, before both Debug and Release checks.
const fullAssetChecks=[...source.matchAll(/^\s+node tests\/ios-assets\.cjs\s*$/gm)];
assert.equal(fullAssetChecks.length,1,'Run the full source/bundle suite once before compilation');
const copyAssetCheck=source.match(/^\s+\.\/node_modules\/\.bin\/cap copy ios\s*$/m);
const configurationLoop=source.match(/^\s+for configuration in Debug Release; do\n([\s\S]*?)^\s+done\s*$/m);
assert(copyAssetCheck && configurationLoop,'Native copy and both build configurations are required');
assert(copyAssetCheck.index<fullAssetChecks[0].index && fullAssetChecks[0].index<configurationLoop.index,
    'Full source/bundle validation must follow native copy and precede both builds');
assert.match(configurationLoop[1],/node tests\/ios-assets\.cjs --built "\$\{flags\[@\]\}"/,
    'Every build configuration must verify its actual copied JavaScript');
assert.match(configurationLoop[1],/if \[ "\$configuration" = Release \]; then flags\+=\(--release\); fi/,
    'Release artifact verification must select the Release debug-mutability exception');
assert.match(source,/git diff --exit-code/);
assert.match(source,/node scripts\/prepare-ios-runtime-smoke\.cjs --apply/);
assert.match(source,/git restore -- ios\/App\/App\/SceneDelegate\.swift/);
assert.match(source,/bash scripts\/run-ios-runtime-smoke\.sh/);
assert(!/secrets\.|id-token:|write-all|contents: write|workflow_dispatch:|pull_request_target:|self-hosted|macos-.*(?:large|xlarge)|upload-artifact|actions\/cache|allowProvisioning|simctl|\bsudo\b|firebase deploy|cap run|cap open|DEVELOPMENT_TEAM=|PRODUCT_BUNDLE_IDENTIFIER=/.test(source),'Unexpected privileges, external state, billing or execution scope');
for(const match of source.matchAll(/uses: ([^\s]+)/g))assert.match(match[1],/^actions\/(checkout|setup-node)@[a-f0-9]{40}$/);
const spm=read('ios/App/CapApp-SPM/Package.swift');
assert.match(spm,/url: "https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\.git", exact: "8\.5\.3"/);
const {instrument}=require('../scripts/prepare-ios-runtime-smoke.cjs');
const native=read('ios/App/App/SceneDelegate.swift'),harness=read('tests/ios-runtime-harness.swift'),script=read('tests/ios-runtime-smoke.js');
assert.match(script,/for\(const language of \['ja','en'\]\)/,'Real WebKit must verify both translations, not just accept either language');
assert.match(script,/GAME_TEXT_LOCALES\[language\]\[step\.titleKey\]/);
assert.match(script,/GAME_TEXT_LOCALES\[language\]\[step\.textKey\]/);
assert.match(script,/native-initial-language-selection/);
assert.match(script,/native-initial-language-persistence/);
assert.match(script,/setGameLanguage\(selectedLanguage\)/);
assert.match(script,/tutorial-language-mutated-gameplay/);
// Keep the real WebKit Worker flow in the instrumented smoke. These static
// requirements do not substitute for executing it in the disposable simulator.
for(const marker of [
    'fourth-confirmed-move-two-help-pages-ja-en-decoded-pause-repeat-guard',
    'same-origin-capacitor-worker-bootstrap',
    'cold-worker-pending-ui-timer-heartbeat',
    'pending-worker-close-terminates-without-resource-spend',
    'cancelled-worker-remains-inert-after-reopen',
    'stage1-genuine-worker-result-ready',
    'ready-start-spends-selected-items-and-begins-life-once',
    'normal-stage1-coupled-action-through-dom-input',
    'normal-stage1-return-settles-one-life-without-stale-worker'
])assert(script.includes("'"+marker+"'"),'Missing real WebKit worker smoke check: '+marker);
assert.match(script,/new NativeWorker\(url,options\)/,'Observe the actual platform Worker instead of a synthetic implementation');
assert.match(script,/clearAdoptedCourseCache\(\);/);
assert.match(script,/adoptedCourseCache\.size===0&&stagePreviewCache\.size===0/,'Cold worker smoke must clear both geometry and preview caches');
assert.match(script,/responses\[0\]\.snapshot===readyJob\.snapshot/,'Ready geometry must come from the real worker response');
assert.match(script,/deadline=started\+90000/);
assert.match(script,/setTimeout\(\(\)=>finish\(false,'overall-timeout'\),90000\)/,'Keep the existing smoke timeout');
const result=instrument(native,harness,script);
assert.equal(result.split('installAscentRuntimeSmoke()').length,3);
assert(result.includes(Buffer.from(script).toString('base64')));
assert(!native.includes('installAscentRuntimeSmoke'));
assert.throws(()=>instrument(result,harness,script));
assert.match(harness,/#if DEBUG && targetEnvironment\(simulator\)/);
assert.match(harness,/environment\["ASCENT_RUNTIME_SMOKE"\] == "1"/);
assert.match(harness,/ASCENTFirebaseMode.*== "offline"/);
assert.match(harness,/png.count <= 2_000_000/);
const runner=read('scripts/run-ios-runtime-smoke.sh');
assert.match(runner,/simctl create "ASCENT-CI-/);
assert.match(runner,/simctl delete "\$udid"/);
assert(!/simctl (erase|delete) (all|unavailable)|\bbooted\b/.test(runner));
assert.match(runner,/SIMCTL_CHILD_ASCENT_RUNTIME_SMOKE=1/);
assert.match(runner,/time.monotonic\(\)\+150/);
assert.match(runner,/r.get\('ok'\) is True/);
console.log('PASS simulator CI: public-only standard macOS, offline unsigned builds; temporary Debug/simulator-only harness; isolated fresh simulator; no product hooks/secrets/deploy/device/artifact upload');
// The existing macOS validation step also executes the Foundation-only native
// recovery policy with Swift, before building either simulator configuration.
require('./ios-resume-lifecycle.cjs');

// Verify the document-start locale bridge without opening a network connection.
require('./ios-initial-language.cjs');
