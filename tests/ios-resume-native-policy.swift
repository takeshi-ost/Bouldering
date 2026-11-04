// Appended to the Foundation-only production policy by ios-resume-lifecycle.cjs.
// No UIKit, simulator, signing, network, or real application defaults are used.
let suite = "ascent.resume-policy-tests.\(UUID().uuidString)"
let defaults = UserDefaults(suiteName: suite)!
defer { defaults.removePersistentDomain(forName: suite) }
private let state = NativeResumeState(defaults: defaults)

func require(_ condition: @autoclosure () -> Bool, _ message: String) {
    precondition(condition(), message)
}
require(state.prepareForActivation(now: 1_000) == nil, "Ordinary cold launch has no resume token")
require(state.prepareForActivation(now: 99_000) == nil, "Inactive time alone never counts as background")
state.enteredBackground(now: 100_000)
require(state.prepareForActivation(now: 100_299.999) == nil, "Less than five minutes keeps the page")
require(state.prepareForActivation(now: 120_000) == nil, "Consumed short background never counts active time")

state.enteredBackground(now: 200_000)
state.enteredBackground(now: 200_200)
let first = state.prepareForActivation(now: 200_300)!
require(UUID(uuidString: first) != nil, "Exactly five minutes produces a UUID")
require(!state.acknowledge(UUID().uuidString), "Mismatched ACK cannot consume recovery")
require(state.pendingID == first, "Recovery stays pending without matching ACK")
require(state.prepareForActivation(now: 900_000) == first, "Duplicate foreground reuses pending token")

private let restarted = NativeResumeState(defaults: UserDefaults(suiteName: suite)!)
require(restarted.prepareForActivation(now: 900_001) == first, "Process restart replays ACK-loss token")
restarted.enteredBackground(now: 910_000)
require(restarted.prepareForActivation(now: 920_000) == first, "Background during reload reuses pending token")
require(restarted.acknowledge(first), "Matching durable JS ACK clears pending token")
require(restarted.pendingID == nil, "ACK has consumed the native token")
require(!restarted.acknowledge(first), "Duplicate ACK is ignored")

restarted.enteredBackground(now: 930_000)
let second = restarted.prepareForActivation(now: 930_300)!
require(second != first, "A later long absence gets its own token")
restarted.enteredBackground(now: 930_400)
require(restarted.acknowledge(second), "An ACK is allowed while backgrounded")
let third = restarted.prepareForActivation(now: 930_700)!
require(third != second, "Background interval survives an ACK delivered in background")
require(restarted.acknowledge(third), "Third token can be acknowledged")

restarted.enteredBackground(now: 950_000)
private let cold = NativeResumeState(defaults: UserDefaults(suiteName: suite)!)
let coldID = cold.prepareForActivation(now: 950_300)!
require(cold.pendingID == coldID, "Cold launch detects persisted actual background time")
require(cold.acknowledge(coldID), "Cold recovery also requires the exact ACK")
cold.enteredBackground(now: 1_000_000)
require(cold.prepareForActivation(now: 999_000) == nil, "A backward clock does not fabricate elapsed time")
print("PASS production Swift native policy: threshold, inactive/short, duplicate callbacks, cold launch, ACK loss, and re-background races")
