# Personal Marinara Keeper

**Current stable package: 4.1.9 — Memory Maintenance.** Target: Marinara **2.5.0 / c565014**. This is a personal pilot; bounded campaign retention is not established.

Catalog: https://raw.githubusercontent.com/Gaia999999999/personal-marinara-keeper/main/catalog.json

Update the existing `personal-character-memory-v4-1` package through **Agents → Download Agents**. Fully stop and relaunch Marinara, refresh the browser, then open **Keeper Tracker Panel → Update setup → Apply v4.1.9 settings** while idle and refresh again. Keep one matching native Keeper. The model connection, sampling preferences and accepted chat memory remain in place. This is not a separate agent JSON import.

4.1.9 promotes the independently audited **4.1.9-rc.2** implementation. The prompt, plan guard, evidence rules, maintenance algorithm and validation are unchanged from that reviewed candidate. Promotion changes version/protocol labels, catalog/package metadata and release documentation only. See [MEMORY_MAINTENANCE_RELEASE.md](MEMORY_MAINTENANCE_RELEASE.md).

The release preserves explicitly marked unresolved plan conditions during ordinary tactical rewrites; handles recognized abbreviation boundaries conservatively; normalizes narrowly recognized legacy provenance in the next validated checkpoint; and guides the model to avoid permanently recording disposable procedural details. Already-lost facts are not recovered automatically. A separately reviewed explicit correction is needed for any known historical omission.

Code carries omitted records into one complete checkpoint and commits only after validation against the exact accepted predecessor. Every submitted evidence ID and current-source rule remains checked. There is no automatic retry, partial save, route conversion, silent eviction, model-authored retirement or semantic archival. Capacity stays **22,000 canonical characters**, **36 ledger rows**, and the existing field/other row limits. Legacy normalization preserves record identity and domain information; bounded maintenance receipts can themselves cause a safe rejection if no room remains.

Normal evidence uses eight prior messages; recovery examines at most 24 supplied entries. The 4.1.8 complete-anchor/GM-wrapper compatibility repair is retained. Missing or changed anchors still block. Updating the package does not rewrite saved history or import a seed.

The panel reads native save status without a model call. Its badge does not independently certify selected swipes, checkpoint revision or factual accuracy. Verify the matching output. Local verification passed **179 tests on reviewed rc.2, stable source and extracted stable payload**, **24 packaging checks**, **76 scope/integrity/syntax checks**, and private replay/correction checks. These results do not establish live model compliance, latency or long-session capacity.

`source/` contains runtime and generic regressions. Run `npm test` there; `python3 build.py` builds the native ZIP/catalog without an upload. Older stable archives remain available. Schema stays `character_memory.v4.1`. Personal RP prose, World State, combat, inventory, injuries and quests are outside this release. Private chats, corrections, raw audit material and replay fixtures are not published here. Historical repair documents and older verification files remain historical; the current release checks are `source/release/TEST_VERIFICATION.json` and `source/release/ASSET_VERIFICATION.json`.
