# Keeper 4.1.6 — retention and budget repair

This release keeps the `personal-character-memory-v4-1` identity and `character_memory.v4.1` schema. It targets Marinara 2.5.0, reviewed at c565014. Personal RP v4.1 and World State are outside the change.

## Durable memory before transcript detail

The prompt distinguishes replaceable views (`cast.now`, scene, progress, relationship wording and anchor tails) from durable ledger facts and plans. Before overwriting current status, the Keeper is instructed to retain still-current custody, conditions and obligations in an appropriate durable record. If no eligible current source supports promotion, it should retain the detail in the current field rather than invent authority or drop it. Mission-related custody belongs in continuity; this does not add inventory arithmetic.

Meaningful private proposals retain their timing, safety conditions, participants and actual audience. A joke or counter-tease does not establish agreement. Repeated banter ordinarily needs no new ledger row or relationship rewrite; consequential boundaries and commitments still deserve memory. The prompt includes generic examples of a secured kit and a private conditional proposal.

The runtime supplies a read-only `retention_review`: references to existing current-status fields and unresolved plans, plus a reminder that replacing a field does not archive its old contents. These references cannot serve as evidence IDs. `budget` now reports actual canonical size, remaining headroom, row counts, unchanged row limits and whether the 16,000-character target has been reached. Pressure is guidance, never permission to discard unique information.

**This is model guidance, not a semantic completeness detector.** A structurally valid completion can still miss a fact or misinterpret a condition. Tests establish preservation after useful facts have been stored; a live model check is still needed for extraction and selection.

## Compact provenance for new writes

New or legitimately updated source/basis/via fields store the stable content-addressed evidence identity instead of repeating clipped narration. Knowledge traces retain their route and, where applicable, named sender within the existing trace format. Evidence resolution, current-source eligibility and literal excerpt checks occur before persistence exactly as before. All submitted evidence IDs are still checked.

No historical checkpoint is migrated or rewritten. Untouched old source notes remain byte-identical. The change reduces metadata growth in future writes; it is not semantic compaction, an archive or a promise of reduced provider billing. The longer retention instructions also add some prepared input.

## Preserved safeguards and limits

`keeper-core.mjs`, `legacy-v4.mjs`, `evidence.mjs`, `transaction.mjs` and `scene-boundary.mjs` are byte-identical to 4.1.5. Omission carry-forward, current author correction, knowledge routes, absent audiences, state successors, destructive-edit guards, exact whitespace-only compaction, completion/anchor checks and atomic rejection remain. The source module changes only how validated provenance is rendered for storage.

Hard limits remain 22,000 canonical checkpoint characters, 36 ledger rows, 240-character foreground fields and 1–6 evidence IDs per item. There is no automatic retry, truncation, eviction or raised capacity. Unique long-session growth can still exhaust the finite budget. Existing omissions require supported correction; updating the package does not retroactively repair accepted memory.

The pinned host's extra assistant-response copy can still contain GM-note bodies after its tag stripping. The clean-ending aid and indexed-source precedence remain; this release does not change the host.

## Verification and setup

**109 deterministic tests pass: all 96 prior regressions plus 13 focused checks. All 21 packaging checks pass**, including ten runtime payload hashes. Added checks cover read-only pressure/context, shorter checked provenance, old-trace preservation, conditional plans and custody surviving subsequent updates, stale-source rejection, explicit correction audience and atomic length rejection.

A private handcrafted repair against an actual saved checkpoint preserves all old domain records while restoring omitted continuity. This is feasibility evidence, not paid model output, a captured live-input replay, an imported seed or an installed-browser test. No live latency/cost improvement is claimed.

Update the existing native package from the same catalog. Fully restart Marinara and refresh its browser page. In Keeper Tracker Panel → Update setup, click **Apply v4.1.6 settings** while idle, then refresh again. This loads the shipped prompt and required settings, retaining the model connection, sampling preferences and saved history. Keep the existing prose preset and World State prompt. Do not import the standalone prompt as another agent.
