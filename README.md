# Personal Marinara Keeper

**Current package: 4.1.5 — field and status repair.** Target: Marinara **2.5.0**, source reviewed at **c565014**. Local regressions pass; live model compliance remains pending. This is a personal pilot, not an official Marinara package or a campaign-readiness claim.

Catalog: https://raw.githubusercontent.com/Gaia999999999/personal-marinara-keeper/main/catalog.json

Update the existing `personal-character-memory-v4-1` package through Marinara's native catalog flow, fully restart Marinara and refresh the browser. In Keeper Tracker Panel → **Update setup**, press **Apply v4.1.5 settings** while idle, then refresh again. This restores the packaged prompt, 24-message supply pool, 8,888-token output allowance and required evidence settings. The selected model connection, sampling preferences and saved chat memory are retained. Keep the existing Personal RP v4.1 preset; this is not a standalone agent JSON import.

4.1.5 gives concise targets for progress and scene fields, reports multiple bounded-field failures together, and makes uncovered replies explicit in the save indicator. It also tells the model to preserve durable plan conditions without granting a newly heard timing detail to absent members of an older shared audience. Existing hard caps remain. See [FIELD_STATUS_REPAIR.md](FIELD_STATUS_REPAIR.md).

Code carries omitted records and commits a complete validated checkpoint atomically. Automatic compaction permits only shorter whitespace-normalized text; it cannot change words or punctuation. Semantic changes need eligible current evidence; explicit corrections need current author evidence. Each change/access item permits 1–6 checked evidence IDs. Disclosure recipients exclude the sender. There is no truncation, automatic retry, partial save or silent eviction. Earlier repairs are documented in [INITIALIZATION_REPAIR.md](INITIALIZATION_REPAIR.md) and [AUDIT_REPAIR.md](AUDIT_REPAIR.md).

The bounded cleaned ending and source precedence from [SCENE_BOUNDARY_REPAIR.md](SCENE_BOUNDARY_REPAIR.md) remain. The pinned host also repeats the assistant response in a separate block whose tag stripping preserves enclosed GM-note text. The supported package API cannot suppress that block. Source guidance does not prove semantic correctness: valid IDs cannot establish that every action, audience or condition was interpreted faithfully.

Normal evidence uses eight prior messages. Recovery can use up to 24 supplied messages, retaining all pending replies that fit. On the pinned host's manual retry route, the target assistant reply occupies one slot, leaving at most 23 prior messages after removal. Missing anchors block reconstruction rather than silently resetting memory. Author-notes seeds load only when no previous checkpoint is selected; they do not overwrite existing saves. Correct an accepted semantic mistake with an explicit current author correction and a normal next update; historical reruns are not in-place edits.

The panel reports **Latest reply has no recorded save** when behind and **Save recorded for latest reply** when caught up. It polls native status without needing another user message. It does not certify a selected swipe, show checkpoint revision or validate facts; inspect output/exports for that. The panel makes no model calls. Apply Settings writes only after a click and never rewrites historical checkpoints.

Verification: **96 deterministic tests** (84 retained and 12 new) plus **20 packaging checks**. Five preservation/source/ending modules remain byte-identical to 4.1.4. No live provider, installed-browser, latency or cost claim is made. The next gate remains a reviewed correction followed by three consecutive accepted story updates.

Capacity remains 22,000 canonical characters and the existing row caps, including 36 ledger records. Historical observations consume that capacity. Whitespace cleanup is not long-session semantic compression; unique growth can exhaust the budget. Inventory, injuries, combat, quests and large-campaign readiness remain outside this release.

`source/` contains generic runtime and synthetic tests. Run `npm test` there; `python build.py` creates the native ZIP and catalog. Historical 4.1.0–4.1.4 archives remain unchanged. The schema stays `character_memory.v4.1`; keep one matching native keeper installed. Personal RP prose and World State are outside this repair. Private chats, cards, presets, raw audits, recovery helpers and private replay fixtures are excluded from this repository.
