# Shared Web and iOS releases

`feature/formal-integration` is the common development and release source.
Do not maintain a separate Web gameplay branch or edit generated `balance-trial`,
`www`, or `ios/App/App/public` files. `main` and its checked-in Pages output are
historical; Pages now uses the Actions artifact from the shared branch.

## Web first, then iOS

1. Make gameplay/UI changes in root `index.html`, `js`, `styles.css`, and `assets`
   on the shared branch (short-lived topic branches can merge back there).
2. Follow AGENTS.md versioning once per requested update. Run focused Web tests
   and relevant native adapter tests whenever shared contracts change.
3. Commit and push. `pages.yml` tests Web/save continuation and packages that
   exact commit with `build-pages-site.cjs`, then deploys the artifact. Failed
   validation does not replace the current live site. Confirm the deployment
   SHA and live `balance-trial/formal-manifest.json` before reporting publication.
4. Fine-tune the Web through further commits to the same shared source. Keep the
   origin, `/Bouldering/` redirect, `/Bouldering/balance-trial/` path and existing
   `ascent.pages-trial.0.4.12.d6.` storage prefix. Do not migrate/reset live saves.
5. When an iOS update is requested, select the reviewed shared commit. Generate
   assets with `ASCENT_FIREBASE_MODE=auto-sync`, copy them to iOS, and verify the
   complete product. Use existing identity/signing and overwrite installation.
   Offline simulator CI is separate and never substitutes for the physical build.
   Do not run different asset modes concurrently in the same checkout.

The initial shared publication was the deployment companion to game release **0.4.61**, based
on iPhone source `4f49d775fd2837dfbebd10b8ec6069a9c3e8e28a`; that publication changed no shared
gameplay source and did not increment the same release again. Shared source is now
**0.5.0**, including the [profile status update](profile-sync-status-050.md). The installed
iPhone remains at the 0.4.61 commit until a separately requested update.

## Necessary platform differences

Both outputs consume the same gameplay, tutorial, language, artwork and layout
inputs. Web adds the existing prefixed-storage adapter and settings-only debug
SEED utility; browser Firebase uses its existing SDK startup, cross-tab deletion
events and browser transfer flow. Native wraps these inputs with bundled Firebase,
an owner-bound post-enable synchronization queue, guarded deletion/retry and fresh
identity reset, UIKit safe-area/locale/audio hooks, durable suspension recovery,
and configuration-dependent debugging/diagnostics. Native transfer stays disabled.
These adapters must not be copied into the browser build or bypassed for parity.

No account deletion, live storage reset, Firebase Rules deployment, iPhone install,
signing or credential change occurs as part of Web publication.

## Evidence and limitations

`test:web` covers packaged runtime, save continuation, fresh STAGE0, synthetic
deletion/reload, language/tutorial, settings, ranking/queues and stage generation.
The prior full aggregate was 105/116: eleven failures/timeouts reproduced on the
pre-fix baseline. This focused release workflow does not claim a full-suite pass.
Production deletion/synchronization, audible output, long suspension and physical
gestures require separate checks; never delete real user data merely to verify.
