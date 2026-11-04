# First-launch language and English alignment — 0.4.60

This unpublished change continues 4f63bdf. It retains the seven result Tips and the five-minute native-background recovery work in that commit. No game version, course identity, Firebase policy, progress, reward, inventory or ranking behavior changes here.

## Startup behavior

- A valid saved `ascent.language.v1` (`ja` or `en`) always wins, without an automatic rewrite.
- Only a genuinely fresh save chooses from the primary device language. Japanese (`ja`, including region/script suffixes) selects Japanese. Any other or unavailable language selects English.
- Native iOS supplies `Locale.preferredLanguages.first` in immutable document-start metadata. Web uses the primary `navigator.language`, falling back to the first `navigator.languages` entry when missing. Lower-priority Japanese does not override another primary language.
- The existing Stage 0 detector captures an ephemeral `firstUse` flag before default saves. The flag is not persisted, and saving the initial language cannot accidentally skip Stage 0.
- Existing users without a valid language choice, including interrupted pending tutorials or unknown/corrupt markers, retain the historical Japanese default. Manual language changes remain available.
- When storage reads fail, first use cannot safely be established, so the app keeps Japanese and does not overwrite unknown data. A failed write does not stop play; the selected language is session-only and is not promised to survive reload. If the tutorial marker saves but the language does not, the next launch conservatively treats the user as existing.
- Pages retains the current namespace. No raw native/former-save language is imported into it.

## Live text

STAGE 0 resolves translation keys on display rather than freezing Japanese during bootstrap. Open, queued and image-loading pages refresh text and language attributes without replacing decoded images, restarting timers, changing input shields, replaying sound or modifying seen flags. The same applies to first encounters with large holds, hearts and pointed holds.

The English audit is recorded in `english-copy-audit-060.md`. Japanese player text and all approved images remain unchanged. There are five current Stage 0 pages; the large-hold explanation is the shared first-encounter modal, not a sixth Stage 0 page.

## Local verification

- The current Web integration matrix covers 45 suites, including startup language, live tutorial/feature-help switching and exact independent Japanese/English help fixtures.
- Three historical test fixtures assumed Japanese without supplying a locale. They now explicitly select Japanese, retaining their original expected values; their reruns pass. No production-language fallback was weakened to satisfy tests.
- Additional checks cover native locale injection and immutable policy, native sync messages, input/gesture regressions, image readiness/13 help-illustration mappings, and 448 conservative modal layouts across seven safe-area viewports and four text scales.
- Offline and auto-sync native asset bundles build and pass verification. Existing native recovery tests retain the 52 crash-boundary cases, one-time refunds, stored outcomes, rewards and pending scores. Emitted SDK/entry tests use mocks and do not connect to Firebase.
- `js/text-ja.js`, release/configuration, course data, Firebase rules/bootstrap and locked dependencies are unchanged.

## Verification limits

No browser visual review, physical device, sound audition, Swift/UIKit/Xcode compilation, live Firebase call, simulator CI run or publication occurred. The available Linux host has no Swift toolchain. The existing auxiliary `tests/text-static.py` cannot parse comments already present in the unchanged Japanese catalog and remains an unrelated historical failure; the active text/help suites run the actual JavaScript catalogs and pass.
