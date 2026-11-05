# Production coupled population verification

The harness loads the production index script list and asserts coupled/finger controls are enabled without any trial global. It does not disable production movement, alter the RNG, choose easier geometry seeds, increase stamina, or replace generation.

Run the complete population (stages 0–401 and 32 actual Daily dates covering all five single families and all 25 ordered paired families):

    npm run test:population

For two bounded-concurrency shards:

    ASCENT_POPULATION_STAGES=0-200 ASCENT_POPULATION_DATES=none ASCENT_POPULATION_TAG=full-low node tests/coupled-production-population.cjs
    ASCENT_POPULATION_STAGES=201-401 ASCENT_POPULATION_DATES=representative ASCENT_POPULATION_TAG=full-high node tests/coupled-production-population.cjs

Run one case or a focused native-transformed comparison:

    ASCENT_POPULATION_STAGES=62 ASCENT_POPULATION_DATES=none ASCENT_POPULATION_TAG=case62 node tests/coupled-production-population.cjs
    ASCENT_NATIVE_TEST=1 ASCENT_POPULATION_STAGES=0,1 ASCENT_POPULATION_DATES=none ASCENT_POPULATION_TAG=smoke node tests/coupled-production-population.cjs

Set `ASCENT_POPULATION_STAGES=none` for Daily-only runs. Set `ASCENT_POPULATION_DATES=2026-01-16,2026-11-05` for exact dates. Set `ASCENT_POPULATION_HAZARDS=1` to additionally search an actual generated optional hazard witness and verify its new-contact penalty, cold replay, full trace and actual live one/ten-sample input. The hazard probe reports whether a witness was found; it never changes hold types.

Each completed case is immediately appended to a JSONL report, so interruption preserves the completed results. Set `ASCENT_POPULATION_SNAPSHOTS=1` to save gzip-compressed generated course snapshots alongside the reports for diagnosis. Complete runs also write a JSON array. Reports are files under `build/coupled-population`, with a production source SHA256, deterministic geometry/action/trace/hearts/stamina/retry fingerprint, real wall-clock timings, actual geometry retry metadata, resource results, and failures. Progress logs include a START/PASS/FAIL line for every case; a failure does not skip independent cases. Compare matching web/native reports with:

    node tests/helpers/coupled-production-parity.cjs web-report.json native-report.json

The parity helper requires matching production source digests. Historical runs before source fixes must not be represented as validation of the final source.

## What is checked

Every case uses actual `reset`, exact explicit action/contact/support/trace replay, a second actual reset to establish deterministic generation, preserved sampled recipe and bounded +1 geometry retries, and actual live one- and ten-sample play to a won state. It also compares final stamina and pickup count with independent trace/resource calculation.

The bare generator reference may deliberately miss optional hearts while the final initial stamina is reduced. Such a reference is reported separately, not declared winnable by substituting its larger internal validation budget. The complete playable plan uses each generated heart's explicit witness at its recorded reference stance, then cancels that detour: production cancellation restores body/contacts without charging a move while keeping swept pickups. The test then resumes the original committed route. It checks actual budget availability before every action and exact end resources. Tutorial stage0 uses its authored real extra-stamina budget.

These are headless production-source tests, including the repository's native source transform. They do not claim a simulator/device/UI-rendering or live-deployment test. Modal presentation and finish side effects are isolated; movement, contact selection, pickup sweep, cancellation, hazard charging, route generation and real input handlers are not stubbed.
