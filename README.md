# Personal Marinara Keeper

**Current stable package: 4.1.10 — Concise Character Status.** Target: Marinara **2.5.0 / c565014**. This is a personal pilot; bounded campaign retention is not established.

Catalog: https://raw.githubusercontent.com/Gaia999999999/personal-marinara-keeper/main/catalog.json

Update the existing `personal-character-memory-v4-1` package through **Agents → Download Agents**. Fully stop and relaunch Marinara, refresh the browser, then open **Keeper Tracker Panel → Update setup → Apply v4.1.10 settings** while idle and refresh again. Keep one matching native Keeper. The model connection, sampling preferences and accepted chat memory remain in place. No separate agent JSON import is required.

4.1.10 adds a **120-character drafting target for each changed `cast.now`**, a compact example, and a per-call reminder. The hard maximum remains **180 characters**. Values of 121–180 characters remain legal. Preserve current custody, conditions, negation and unanswered choices; the soft target never licenses forgetting them or moving overflow into permanent ledger events. See [CHARACTER_STATUS_RELEASE.md](CHARACTER_STATUS_RELEASE.md).

This is a guidance-only follow-up to audited 4.1.9. All nine enforcement modules are byte-identical to 4.1.9. Server changes are restricted to the model-facing instruction and version/protocol labels; client changes are version labels only. An overlong proposal still rejects as a whole. There is no automatic truncation, retry, partial save, route conversion, silent eviction, model-authored retirement or semantic archival.

4.1.9's scoped plan-clause protection, conservative abbreviation handling, deterministic legacy provenance maintenance and selective memory guidance are retained. See the historical [MEMORY_MAINTENANCE_RELEASE.md](MEMORY_MAINTENANCE_RELEASE.md). Already-lost facts are not recovered automatically. Updating does not rewrite history or import a seed.

Capacity stays **22,000 canonical characters**, **36 ledger rows**, and the existing field/other row limits. Legacy normalization preserves domain information and source identity; it provides one-time headroom, not an unlimited campaign solution. Normal evidence uses eight prior messages; recovery examines at most 24 supplied entries. Missing or changed anchors still block; the 4.1.8 complete-anchor/GM-wrapper compatibility repair is unchanged.

The panel reads native save status without a model call. Its badge does not independently certify selected swipes, checkpoint revision or factual accuracy. Verify the matching output. Local checks pass **185 tests on release source and extracted payload**, **24 packaging checks**, **92 scope/integrity/syntax checks**, plus private replay checks. Prompt compliance, latency and future capacity still require live observation.

`source/` contains runtime and generic regressions. Run `npm test` there; `python3 build.py` builds the native ZIP/catalog without an upload. Older archives remain available. Schema stays `character_memory.v4.1`. Personal RP prose, World State, combat, inventory, injuries and quests are outside this release. Private chats, corrections and replay fixtures are not published here. Current checks are `source/release/TEST_VERIFICATION.json` and `source/release/ASSET_VERIFICATION.json`; older release documents remain historical.
