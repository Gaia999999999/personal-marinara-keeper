# Personal Marinara Keeper

**Current package: 4.1.2 — audit repair.** Target: Marinara **2.5.0**, source reviewed at build **c565014**. Local regressions pass; installed UI and live provider validation remain pending. This is a personal pilot, not an official Marinara package or a campaign-readiness claim.

Catalog: https://raw.githubusercontent.com/Gaia999999999/personal-marinara-keeper/main/catalog.json

Update the existing `personal-character-memory-v4-1` package through Marinara's native catalog flow, fully restart Marinara, and refresh its browser page. In the Keeper Tracker Panel, expand **Update setup**, press **Apply v4.1.2 settings** while agents are idle, and refresh again. This restores the packaged prompt and evidence settings, including a 24-message supply pool. The selected model connection and saved chat memory are retained. Use the existing Personal RP v4.1 preset; this is not a standalone agent JSON import.

An independent read-only audit exposed accepted destructive edits and false rejections in 4.1.1. This update fixes current-source authority, multiline OOC boundaries, protected field clearing, receipt capacity/expiry, state succession and disclosure ordering. See [AUDIT_REPAIR.md](AUDIT_REPAIR.md) for the disposition and limits.

Code carries omitted records and commits a complete validated checkpoint atomically. Automatic compaction now permits only shorter whitespace-normalized text: it cannot change words or punctuation. Semantic updates require eligible current evidence; explicit corrections require current author evidence. A valid source ID still does not prove that the model interpreted it correctly. Natural-language truth, audience and condition checking remain model responsibilities within the enforced structural boundaries.

Normal evidence uses eight prior messages. Recovery can use up to 24 supplied messages, retaining all pending replies that fit. On the pinned host's manual retry route, the current assistant reply occupies one of those 24 slots, leaving at most 23 prior messages after it is removed. Missing anchors block reconstruction rather than silently resetting memory. Author-notes seeds load only when there is no selected previous checkpoint; they do not overwrite an existing save.

The panel reports the host's last recorded successful save and newer reply count. It does not certify the selected swipe or show the checkpoint revision. Inspect the injected checkpoint for that; detailed errors remain in Agents. The panel makes no model calls, and its settings button writes only after a user click.

Verification: **58 deterministic tests**, **19 packaging checks**, and a targeted private hand-authored Pinewatch replay pass. The 4.1.1 audit baseline was checked against all eight payloads of the published frozen archive. No live model compliance, latency or token-cost claim is made. Actual UI rendering remains untested locally because Chromium was unavailable. The next gate is fresh initialization plus 3–5 consecutive accepted updates, after any focused re-audit of this patch.

The checkpoint remains bounded at 22,000 characters and 36 ledger rows. Earlier state observations consume that capacity. Whitespace cleanup is deliberately conservative and cannot provide long-session semantic compression; unique growth can exhaust the budget. There is no automatic archive or silent eviction. Inventory, injuries, combat, quests and large-campaign readiness remain outside this release.

`source/` contains the generic runtime and synthetic tests. Run `node --test tests/run.mjs tests/status.mjs tests/audit.mjs` there; `python build.py` creates the native ZIP and catalog. Historical 4.1.0 and 4.1.1 archives remain unchanged. Older runtimes need not accept new checkpoints containing the expanded receipt count; keep one matching native keeper installed. No private chats, cards, preset content, raw audit attachment or private replay fixtures are published here.
