# Keeper 4.1.8 — GM wrapper compatibility repair

16 October 2026. Baseline: stable 4.1.7, commit `542d5fddeb59a5a37a8aa6e635e7a66450a03901`. Target remains Marinara 2.5.0 / c565014. This fixes checkpoint recognition across known GM-note representations while preserving strict rejection and the accepted memory.

## Scope

`sources.mjs` excludes both known XML GM wrappers and bare `[GM_UPDATE_V1]` / `[GM_NOTES...]` blocks from actionable assistant evidence. Missing or mismatched closing markers consume the remainder. Existing hidden XML blocks remain hidden; ordinary brackets and arbitrary story HTML are not treated as interchangeable. Narrative blank-line runs use the pinned host's layout convention. The standard nested XML/sentinel annotation is extracted once as a non-actionable reference.

New anchors use that canonical narrative. Accepted older anchors remain verifiable through at most three explicit representations: the new canonical form, the exact former narrative form, and the old GM-wrapper tag-stripped form. Each match checks the full user ID/text pair hash, both source references and both retained tails. It does not accept a tail-only match, rewrite a checkpoint, infer absent text, strip arbitrary story markup or search beyond the 24-message bound. Legacy GM contents participate only in verifying the old fingerprint; they do not enter the new actionable catalog.

`evidence.mjs` uses the same full-pair matcher for continuation and already-committed checks. An unlocated anchor reports the examined input count and pauses. A full window does not prove overflow; no automatic seed, reset, selection change or recovery follows. The new diagnostic avoids the pinned Marinara formatter's false missing-parameter warning.

Five core modules are byte-identical to 4.1.7: keeper-core, legacy-v4, transaction, scene-boundary and retention. Server/client changes are version/protocol strings only. The model prompt is byte-identical. Agent settings, schema, permissions, 8-message normal/24-message recovery bounds, 8,888 output allowance, 22,000-character state cap, row/field caps and six-ID evidence bound are unchanged. Current-source rules, audience checks, destructive-edit guards, atomic rejection and omission carry-forward remain in place. No route is coerced.

## Verification

- **144 runtime tests pass:** all 125 prior tests, with two diagnostic expectations updated precisely, plus 19 compatibility tests.
- **22 packaging checks pass:** exact ZIP/catalog references and all ten payload hashes.
- Added tests cover raw/stripped and interior note forms; missing/mismatched closers; ordinary story markup; exact legacy identity and changed-user/narrative controls; already-saved detection; real history truncation; current-response duplication; finalizer races; atomic failure; the pinned client formatter; and ten successive updates alternating note forms while preserving quiet cast/plans.
- A private reconstructed export case reproduces the stable failure and passes 11 repair checks, including one pending reply and preserved state. A hand-authored supported transaction yields a hypothetical next revision, then another continuation. Neither is an actual model result, import seed or live save.
- The private recovery UI passes 31 mocks and checks all reviewed message hashes/selections, the exact accepted baseline and native save status before permitting one targeted recovery call.

See `source/release/COMPATIBILITY_VERIFICATION.json`, `TEST_VERIFICATION.json` and `ASSET_VERIFICATION.json`. The build fixes a deterministic integration failure; it does not certify installed-host behavior or broad model semantics.

## Limits retained

The original live hook input was not exported; the exact incompatible text forms are reconstructed, but the originating transformation call site is not proven. Completely unmarked prose cannot be recognized as a removed annotation without guessing, and is not heuristically deleted. The host may still repeat unindexed response text outside the catalog; the unchanged prompt instructs the model to ignore it as evidence.

Full successful-transaction citation lists remain unavailable in normal exports. Natural-language entailment, already-recorded semantic drift, finite memory capacity and meaningful compaction remain separate limitations. This release performs no silent fact repair or semantic deletion. Personal RP v4.1 and World State are unchanged. The supplied optional implementation was reviewed independently; no supplied code was installed verbatim and no secondary auditor is claimed.

Update the existing native package, fully restart Marinara, apply v4.1.8 settings and refresh. Follow the owner's paired recovery-and-ten-reply guide. A failed/uncertain save still stops the test; a confirmed recovery permits ten ordinary replies without an intermediate review turn.
