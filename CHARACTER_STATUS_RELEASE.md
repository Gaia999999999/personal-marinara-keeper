# Keeper 4.1.10 — concise character status

17 October 2026. Narrow guidance follow-up to published 4.1.9 (`ce1dfb997c354eb596aab58ef584e0a566f19413`).

Live proposals exceeded the unchanged 180-character cast.now limit: one field was 197 characters; a later proposal contained 186- and 194-character fields. Strict rejection retained the previous checkpoint. Later catch-up updates saved correctly. Local replay reproduces both failures; shortening only those status fields clears them under the existing validator.

## Change

The prompt and model-facing per-call instruction now target **120 characters per changed character status**. A concise example retains custody, an unanswered choice and explicit non-completion. Guidance removes unnecessary choreography and repeated banter while retaining conditions, unique obligations and uncertainty. It explicitly allows 121–180 characters when needed and forbids using new ledger rows merely as overflow storage.

The 180-character hard cap, every other field/row limit, 22,000-character checkpoint cap, evidence/currentness checks, audience protections, author-correction rules, retained predecessor/race checks, atomicity and recovery are unchanged. No proposed output is automatically shortened. The model must comply; rejection remains the fallback.

## Scope verification

- All nine enforcement modules are byte-identical to 4.1.9: core, transaction, evidence, sources, scene boundary, retention, provenance, plan guards and legacy conversion.
- Server changes: one model-facing instruction plus release/version/protocol labels. No new prepared-context keys or validation path.
- Client changes: version labels only. Agent settings and capability contract remain unchanged.
- The prompt adds only character-status concision instructions and a final field-specific check.
- Six new generic regression groups cover single/combined overruns, unchanged atomic rejection, 121–180 acceptance, custody/condition preservation, later catch-up, and consistent installed guidance. Existing regressions change version/path expectations only.
- No edits to Personal RP or World State. No live checkpoint mutation, seed replacement, installation or paid call performed during this build.

## Verification

| Check | Result |
| --- | --- |
| Published 4.1.9 baseline | 179/179 |
| 4.1.10 source | 185/185 |
| Extracted native package | 185/185 |
| Package contract/integrity | 24/24 |
| Scope, syntax, baseline/public identity, shipped bytes | 92/92 |
| Current live-export differential/rejection/continuation groups | 8/8 |
| Historical maintenance/route-rewrite replay groups | 12/12 |
| O3 abbreviation differential groups | 5/5 |

Native artifact: **46,379 bytes**, SHA-256 **`1cbd3f9660b7ede7f302ae30c2f43c57c483a704bd58d72661683913a062a529`**.

## Next gate and limits

Lead decision: an additional adversarial audit is not required for this guidance-only follow-up. The audited enforcement implementation is unchanged and the exact live failures remain strict rejections. The next gate is a controlled live run, not another architecture round. Local tests establish deterministic behavior, not a guarantee of future model adherence or faster generation.

Use the owner's current continuation guide. Do not rerun already-saved replies or repeat completed historical corrections. Existing legacy savings are exhausted once normalized; new consequential records and successors can still grow. Capacity exhaustion safely stops an update. This release does not solve bounded long-session retention or semantic correctness of every supported citation.
