from pathlib import Path
import subprocess,tempfile,os
s=Path('ios/App/App/AscentAnalyticsPlugin.swift').read_text()
a=s.index('    static func initialAnalyticsEnabled(');b=s.index('    static func accept(',a)
fn=s[a:b].replace('static func','func',1)
tests='''
for choice: Bool? in [nil, false, true] {
 assert(!initialAnalyticsEnabled(termsAccepted:false,previouslyAccepted:false,explicitAcceptance:true,existingChoice:choice))
 assert(initialAnalyticsEnabled(termsAccepted:true,previouslyAccepted:false,explicitAcceptance:true,existingChoice:choice))
}
assert(!initialAnalyticsEnabled(termsAccepted:true,previouslyAccepted:true,explicitAcceptance:false,existingChoice:false))
assert(initialAnalyticsEnabled(termsAccepted:true,previouslyAccepted:true,explicitAcceptance:true,existingChoice:false))
assert(!initialAnalyticsEnabled(termsAccepted:true,previouslyAccepted:false,explicitAcceptance:false,existingChoice:false))
assert(initialAnalyticsEnabled(termsAccepted:true,previouslyAccepted:true,explicitAcceptance:false,existingChoice:true))
print("PASS actual Swift analytics decision: first explicit acceptance ON including old OFF; before consent OFF; legacy OFF requires explicit acceptance; no silent enablement; explicit reaccept ON")
'''
assert 'guard previouslyAccepted || explicitAcceptance' in s
assert 'if !previouslyAccepted && AscentTermsGate.initialAnalyticsEnabled(termsAccepted: AscentTermsGate.recordAccepted,' in s
assert 'if allowed && !deletionPending { activate() }' in s
assert 'static var accepted: Bool { recordAccepted && UserDefaults.standard.object(forKey: "ascent.analytics.permission.v1") as? Bool == true }' in s
assert 'return recordAccepted' in s
assert '@objc func privacy(' not in s
assert 'func choose(' not in s
assert 'guard allowed else { return false }' in s
assert 'explicitAcceptance:consent===true' in Path('scripts/native-first-run-runtime.js').read_text()
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'test.swift';p.write_text(fn+tests)
 subprocess.run(['xcrun','swift',str(p)],env=dict(os.environ,DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer'),check=True)
