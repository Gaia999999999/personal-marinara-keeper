# Keeper 4.1.5 — field and save-status repair

This narrow repair keeps the `character_memory.v4.1` schema, native package identity, evidence rules and memory limits. It targets Marinara 2.5.0, reviewed at c565014. Personal RP v4.1 and World State are unchanged.

## Output guidance and diagnostics

`through` is one short progress/correction sentence, aiming at 120 characters. `scene` holds the immediate foreground, aiming at 180 characters. Both retain the existing hard maximum of 240 UTF-16 characters. These are characters, not words. Character positions belong in cast state; durable deadlines and conditions belong in plan fields. The prompt includes a concise example and a final length check.

Validation now collects foreground and recognized nested text overruns with evidence-list failures before compiling changes. It reports up to four diagnostics and counts additional failures. Existing limits are unchanged. There is no truncation, citation trimming, partial save or automatic retry: rejection retains the accepted checkpoint.

A timing change heard by only part of a shared plan's audience needs a separately scoped target when changing the shared plan would imply that absent people heard it. The prompt preserves the original plan, records the narrower condition for actual listeners, and keeps an estimate proposed until events support progress. This is model guidance within the existing schema, not a new semantic audience detector.

## Save indicator

The badge now says **SAVE STATUS**. When the latest reply is uncovered, the title says **Latest reply has no recorded save · last save #N**. A recorded save on the latest reply says **Save recorded for latest reply · #N**. The panel already polls the host independently of user messages; its explanation now makes that explicit.

The indicator reads native save cadence. It does not certify the selected swipe, checkpoint revision, factual accuracy or completeness of interpretation. Detailed output/errors remain in Agents. Refresh status is read-only. No paid retry control or automatic model call was added to the package.

## Preserved safeguards and limits

Evidence IDs still resolve individually and must meet current-source/operation rules. Explicit corrections still require current author evidence. Disclosure recipients exclude senders; private audiences, destructive-edit checks, omission carry-forward, whitespace-only compaction, anchor checks and atomic rejection remain. Capacity stays at 22,000 canonical characters, including at most 36 ledger rows. Unique long-session growth can exhaust that budget; there is no silent eviction or automatic archive.

The 4.1.4 clean-ending aid and source precedence remain. The pinned host still supplies a separate response copy whose tag stripping can retain GM-note bodies; this repair cannot suppress it. Neither valid citations nor compact field lengths prove that the model interpreted an action or condition correctly.

## Verification and installation

**96 deterministic tests pass: 84 retained plus 12 new. All 20 packaging checks pass**, including the nine payload hashes. `keeper-core.mjs`, `legacy-v4.mjs`, `sources.mjs`, `evidence.mjs` and `scene-boundary.mjs` are byte-identical to 4.1.4. Transaction validation changes only in the bounded diagnostic preflight described above.

Tests cover combined overruns, exact-limit acceptance, one-character rejection, invalid types, unchanged rejected inputs/baselines, retained source validation, separate target audiences, and status changes without a new user message. These are local synthetic tests, not paid model, installed-browser, latency or cost measurements. Live compliance remains the next gate.

Update the existing native package from the same catalog, fully restart Marinara and refresh its browser page. In Keeper Tracker Panel → Update setup, press **Apply v4.1.5 settings** while idle, then refresh. It restores the shipped prompt and required settings while preserving the model connection, sampling preferences and saved memory. Updating does not rewrite historical checkpoints.
