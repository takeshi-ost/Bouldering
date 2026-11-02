# Unsigned simulator compilation

The work-branch-only `ios-simulator.yml` workflow uses standard `macos-15` with
preinstalled Xcode 26.2, pinned Node/actions and the existing locked dependencies.
The repository is public; standard hosted runners are free for public repositories.
A public-only job guard stops this job if repository visibility becomes private.
No larger runner, artifact upload/cache, secret, Apple account or new permission
is configured. The token is contents-read only, and checkout does not retain it.

The disposable runner builds the offline game bundle, uses the installed Capacitor
CLI only to copy it into the temporary checkout, resolves the existing exact
Capacitor Swift package, and compiles Debug and Release for generic iOS Simulator.
Code signing is disabled on the command line. No team, bundle ID, signing file or
Xcode project setting is edited. Tracked-source changes after copying/building
cause the job to fail. The native project still has its original version/build.

Each product is checked for simulator targeting, offline configuration, copied
resources and Debug/Release-specific game code. Dependencies are downloaded from
their standard public sources; the game never connects to Firebase.

## Real WebKit runtime smoke

After the unchanged product builds, CI temporarily adds a simulator-only Debug
diagnostic bridge to its disposable copy of SceneDelegate and recompiles Debug.
The tracked source is restored before running; no product hook or test JavaScript
is checked into the app's source/resources. The bridge requires an explicit launch
environment flag and an offline build; it cannot run in Release or on a device.

CI creates its own new iPhone simulator, installs/launches only this test copy and
runs the real game in WKWebView. The checks use DOM click/change events and
programmatic route input, not physical fingers or an XCTest accessibility driver.
They inspect title/tutorial/settings/help/game flow without a mocked game engine.
A bounded timeout and explicit result must pass; app launch alone is not success.
Only the newly-created simulator is deleted afterward. Existing saves and any
user's Mac/simulator/device are never accessed.

Up to five screenshot PNGs are captured in the runner with a 2 MB per-image cap.
The report contains only fixed check labels, geometry and image hashes, not saves,
UIDs or credentials. There is no artifact upload because available storage/billing
has not been verified. Screenshot capture and DOM layout checks do not constitute
human visual inspection. Sound playback/listening, physical swipe behavior,
distribution signing, real Firebase authentication and production Rules remain
outside this check.

The exact run status and Xcode version are recorded in GitHub Actions. A failure
is not an authorization to enable signing, create credentials, use a larger runner
or change a user's local Mac/device.

References (checked 2026-11-02):
- [GitHub standard public runners and free usage](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#standard-github-hosted-runners-for-public-repositories)
- [macOS 15 installed software](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md)
- [Capacitor 8 requires Xcode 26+](https://capacitorjs.com/docs/getting-started/environment-setup)
