# Personal Marinara Keeper

**Current package: 4.1.8 — GM Wrapper Compatibility Repair.** Target: Marinara **2.5.0 / c565014**. This is a personal pilot; campaign readiness is not established.

Catalog: https://raw.githubusercontent.com/Gaia999999999/personal-marinara-keeper/main/catalog.json

Update the existing `personal-character-memory-v4-1` package using Marinara's native catalog flow. Fully exit and relaunch Marinara, refresh the browser, then open **Keeper Tracker Panel → Update setup → Apply v4.1.8 settings** while idle and refresh again. Keep one matching native Keeper. Model connection, accepted memory and sampling preferences are retained. This is not a separate agent JSON import.

4.1.8 makes known GM-note formats consistent for anchors and actionable evidence, verifies accepted older anchors by their complete user/reply identity, and fixes the misleading unlocated-anchor diagnostic. Details: [GM_COMPATIBILITY_REPAIR.md](GM_COMPATIBILITY_REPAIR.md). The model prompt and transaction validator remain unchanged from 4.1.7.

Code carries omitted records into one complete checkpoint and commits only after validation. Each submitted evidence ID and its current-source eligibility are checked. No automatic retry, partial save, route conversion, truncation, silent eviction or semantic compaction is added. Capacity remains 22,000 canonical characters, 36 ledger rows and the existing field/other row caps. Whitespace-only compaction remains bounded.

Normal evidence uses eight prior messages; recovery examines at most 24 supplied entries. The pinned host's manual retry includes the target reply in its supplied pool. A missing or mismatched anchor blocks; the diagnostic no longer assumes that a full input proves overflow or tells the owner to change API parameters. Accepted checkpoints are verified, not migrated or replaced by seeds.

The panel reads native save status without a model call. Its badge does not certify facts, selected swipes or revision numbers. Successful exports contain the checkpoint rather than the full original transaction's evidence lists. Structurally eligible evidence can still be semantically misapplied; prior audit limitations remain open.

Verification: **144 runtime tests, 22 packaging checks**, an independent scope check, **11 private replay checks** and **31 recovery-helper mocks**. The added runtime suite includes ten alternating-format updates. These local results do not certify the installed host, model compliance, latency, cost or long-session capacity. Follow the paired owner guide for controlled recovery and ten new assistant replies; stop on a failed or uncertain save.

`source/` contains generic runtime and regressions. Run `npm test` there; `python build.py` builds the native ZIP/catalog. Older stable archives and frozen candidate branches remain retained. Schema stays `character_memory.v4.1`. Personal RP prose, World State, combat, inventory, injuries and quests are outside this release. Private chats, helper pins, raw reference material and replay fixtures are not published here.
