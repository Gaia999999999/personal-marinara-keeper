# Keeper 4.1.4 — scene boundary repair

Built 14–15 October 2026 for Marinara 2.5.0; host source pinned to `c56501495a8baf76c258e76534c8728a9b7859bb`.

## Problem and verified host behavior

A proposal can satisfy structural and evidence-ID validation while still converting a pending action into a completed one. In particular, a conflicting GM annotation may assert departure while accepted narration ends at an unanswered seating choice and a conditional arrival estimate.

In the pinned host's `packages/server/src/services/agents/agent-executor.ts`, `buildStandardAgentMessages` passes the response to `buildAgentMessages` even when all optional context sources are off. `formatAgentMainResponseForPrompt` calls `stripHtmlTags`, which removes tags but retains their bodies. Thus GM-note prose can survive in the separate `assistant_response` block even though Keeper's evidence catalog excludes it.

The pinned `capability-agent-runtime.service.ts` exposes prepare/finalize hooks, not a supported per-agent prompt-replacement hook. This package does not mutate shared host context, change the host, or impersonate a built-in agent. The conflicting block remains visible. Its causal contribution to a particular earlier model output cannot be proven without that call's full captured prompt; the input path itself is confirmed by source and extracted-function execution.

## Changes

- `scene-boundary.mjs` exposes the last at most 2,000 UTF-16 characters of cleaned accepted narration, the number of omitted prefix characters, its reply reference and current author-source IDs. It uses the existing narrative cleaner; the full bounded evidence catalog remains available. The ending is a reading aid, not new evidence or a saved checkpoint field. Clipping does not split a surrogate pair.
- The prompt names the competing host block and states source precedence. It applies the unresolved-action rule across `through`, `scene`, `cast.now`, plans and ledger. A general example distinguishes an engine starting, an open seat choice and a conditional arrival from completed boarding/departure.
- A current explicit OOC correction may repair affected foreground fields without becoming an event, disclosure, time advance or permanent movement restriction. Untouched records remain carried by code.
- The existing 100-character timing cap remains. Guidance asks for timing and conditions without repeating the plan's travel action or location.
- Apply Settings clears optional context, custom abilities and tools while preserving the selected connection and sampling preferences. Runtime setup checks reject explicitly re-enabled channels. These checks do not claim the host's unconditional response copy has been removed.

The cleaned ending adds at most 2,000 characters plus small metadata to the prepared input. This is a deliberate bounded duplicate of existing narration, not an input-cost reduction. No provider token or latency measurement was made.

## Preserved safeguards

`keeper-core.mjs`, `legacy-v4.mjs`, `sources.mjs`, `evidence.mjs` and `transaction.mjs` are byte-identical to 4.1.3. The checkpoint schema, six-ID allowance, current-source rules, grounded disclosure checks, sender exclusion, explicit author-correction authority, destructive-edit guards, whitespace-only compaction, row/text limits, anchor/concurrency checks and atomic rejection remain in force. There is no silent truncation, deletion, source promotion or retry loop. Personal RP and World State are unchanged.

## Verification and limits

`npm test`: **84 passed, 0 failed** — all 72 prior tests plus 12 regressions covering cleaned endings, malformed hidden blocks, clipping, current-author scope, correction preservation, ordinary-user authority rejection, retained timing limits, setup checks, settings preservation and concurrent edits. `python build.py`: **20 packaging checks passed**, including all nine payload hashes/sizes and the exact catalog archive reference.

Separately, extracted response-builder functions from the pinned host reproduce retained GM text with history disabled. A private test starts from the actual accepted baseline and uses a synthetic next user/reply plus a handcrafted correction transaction. It validates the supported next-update path and preservation of unrelated memory and audiences. It is not a captured model replay, a repaired import seed, a paid call or a live saved checkpoint.

Natural-language correctness remains a model responsibility within the structural guardrails. The release has not passed a new installed-host/model test or browser-rendering check here. An accepted correction must be reviewed before three regular consecutive updates. Long-session capacity, semantic compression and dedicated adventure mechanics are still separate work.

## Updating an existing installation

Update the existing package to **4.1.4**, fully restart Marinara, refresh the browser, then use **Keeper Tracker Panel → Update setup → Apply v4.1.4 settings** while idle. Refresh again and retain one active native keeper. Existing saved checkpoints retain their original version metadata until a new update succeeds.

For an already saved semantic mistake, use an explicit current OOC correction followed by a short normal response and normal Keeper update. Historical retry loads the host-selected earlier baseline; it is not an in-place edit of the latest checkpoint. Do not overwrite native runs, seed over an existing save, or reroll repeatedly to obtain a preferred interpretation. Review the resulting saved revision and stop on an unsuccessful or uncertain result. The user's case-specific correction and installation guide are private.
