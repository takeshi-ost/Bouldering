# Pregenerated courses (0.5.18)

Bundled: STAGE1–100 and Daily2026-10-14–2026-12-13 (61 dates), generated with0.5.17.
Remote test feed: https://takeshi-ost.github.io/Bouldering/test-course-data/stages-101-150/manifest.json (STAGE101–150).

Title preparation checks updates without blocking play. Verified packs are stored atomically in IndexedDB. Within a1000-ID bucket, lookup considers downloaded and bundled packs by generation date; missing entries in the remote partial test pack still use bundled1–100. An app release change alone does not invalidate a course. Eligibility requires generationVersion>=0.5.0, supported schema, length/hash integrity, matching generation conditions/runtime signature and successful route replay. Missing/invalid/unusable data falls through to an intact older record or the existing runtime generator. No progress or inventory is stored in these packs.

Update skip uses the downloaded pack date only: a newer partial bundle must not suppress a remote-only stage. Downloaded packs replace their bucket rather than merging earlier downloads; future normal updates should contain the complete intended bucket. Newest generation date determines precedence among valid records, not app release/build ID.

Downloads use approved HTTPS, omit credentials, reject redirects, and have bounded request time and size. Native default builds allow the specific feed directory; explicit offline CI builds remove the remote URL and retain network-blocking CSP. Course data preparation is independent of app builds; builds package existing manifest-referenced data.

Compact data retains game geometry, actions/limb positions, hearts and stamina; traces are reconstructed and diagnostic reports are omitted. Guide-only stamina checks exclude deliberate off-guide heart pickup detours. All50 remote courses passed production down/move/release replays with reachable pickup drags and cancel, under the generation baseline selector. This is not a physical-device or new-selector input test. Real browser IndexedDB/WKWebView persistence and iPhone testing remain separate.
