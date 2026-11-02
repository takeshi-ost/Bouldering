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
resources and Debug/Release-specific game code. The app is not installed or
launched. Compilation does not verify UI/audio, device behavior, distribution
signing, real Firebase authentication or production Rules. Dependencies are
downloaded from their standard public sources; the game never connects to Firebase.

The exact run status and Xcode version are recorded in GitHub Actions. A failure
is not an authorization to enable signing, create credentials, use a larger runner
or change a user's local Mac/device.

References (checked 2026-11-02):
- [GitHub standard public runners and free usage](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#standard-github-hosted-runners-for-public-repositories)
- [macOS 15 installed software](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md)
- [Capacitor 8 requires Xcode 26+](https://capacitorjs.com/docs/getting-started/environment-setup)
