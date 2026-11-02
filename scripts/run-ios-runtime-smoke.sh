#!/bin/bash
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" == true && "${RUNNER_OS:-}" == macOS && "${ASCENT_FIREBASE_MODE:-}" == offline ]]
app=build/DerivedData/Build/Products/Debug-iphonesimulator/App.app
[[ "$(/usr/libexec/PlistBuddy -c 'Print :ASCENTFirebaseMode' "$app/Info.plist")" == offline ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print :ASCENTBuildConfiguration' "$app/Info.plist")" == Debug ]]
bundle=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")
runtime=$(xcrun simctl list runtimes --json | python3 -c 'import json,sys; r=[v for v in json.load(sys.stdin)["runtimes"] if v.get("isAvailable") and v["identifier"].startswith("com.apple.CoreSimulator.SimRuntime.iOS-")]; assert r,"No installed iOS simulator runtime"; print(max(r,key=lambda v:tuple(map(int,v["version"].split("."))))["identifier"])')
udid=$(xcrun simctl create "ASCENT-CI-${GITHUB_RUN_ID}" com.apple.CoreSimulator.SimDeviceType.iPhone-16 "$runtime")
# Only this newly-created disposable simulator is removed, never an existing one.
trap 'xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true; xcrun simctl delete "$udid" >/dev/null 2>&1 || true' EXIT
xcrun simctl boot "$udid"
xcrun simctl bootstatus "$udid" -b
xcrun simctl install "$udid" "$app"
container=$(xcrun simctl get_app_container "$udid" "$bundle" data)
SIMCTL_CHILD_ASCENT_RUNTIME_SMOKE=1 xcrun simctl launch --terminate-running-process "$udid" "$bundle"
mkdir -p build/runtime-smoke
python3 - "$container/Library/Caches/ascent-runtime-smoke" "$runtime" <<'PY'
import json,pathlib,shutil,sys,time,hashlib
source=pathlib.Path(sys.argv[1]); output=pathlib.Path('build/runtime-smoke')
deadline=time.monotonic()+150
while not (source/'report.json').exists():
 if time.monotonic()>deadline: raise SystemExit('Runtime smoke timed out; no success inferred')
 time.sleep(1)
r=json.loads((source/'report.json').read_text());r['runtime']=sys.argv[2]
allowed={'title','intro-first','stage-settings','help','map-start'}
for image in r.get('images',[]):
 name=image.get('name');assert name in allowed
 file=source/(name+'.png')
 if file.exists():
  data=file.read_bytes();assert len(data)<=2_000_000 and data.startswith(b'\x89PNG\r\n\x1a\n')
  shutil.copyfile(file,output/file.name);image['sha256']=hashlib.sha256(data).hexdigest()
(output/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(r,ensure_ascii=False))
assert r.get('ok') is True,'Real runtime smoke failed'
assert len(r.get('images',[]))>=3 and all('error' not in i for i in r['images']),'Snapshot capture failed'
PY
