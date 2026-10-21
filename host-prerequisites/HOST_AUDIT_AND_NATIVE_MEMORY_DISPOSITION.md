# Corrected host audit accepted; native memory proposal disposition

Date: 20 October 2026 (New York). Evidence package: Native Memory Retention Preflight 0.1.0.

## Lead decision

Accept the corrected **scoped PASS** for Host Save-Binding 0.1.0-rc.1. The report now identifies the exact source, withdraws the unsupported test/coverage/next-gate claims, and distinguishes offline execution, source inspection and supplied host logs. Its manifest and structural facts reproduce. No substantive runtime repair or second audit of the same F2 patch is needed. Candidate source ZIP remains SHA-256 `733156af7682f7f5f0e8e19145235f89a30179e9736654ade099877f45fff8bf`, published review commit `92b08932ee70b069ad217e2ed39d5b1517b860bd`.

“Immutable target” in the corrected report means a captured local index, not an immutable persistent swipe identity. Deletion/reindexing, concurrent content/parent changes, other saveRun callers and save-error acknowledgements remain outside the patch. Historical forwarding has inspected/type-checked coverage, not a new end-to-end lorebook test. These qualifications do not reopen F2.

Keeper stable remains 4.1.11 / `10249ee2b21cb8c9429e5db5df634e43232c08b5`. No host installation, Keeper release, live checkpoint update, provider call, setting switch, archive or retirement has occurred. This package is an executable investigation and a concrete architecture review, **not a new installable runtime candidate**.

## Architecture note: material dispositions

| Observation / recommendation | Disposition and evidence |
|---|---|
| Native Advanced Memory is a plausible historical recall partner for Keeper | **Valid direction.** It has pre-prose selection, managed scene records, bounded recall, audience controls and native transfer handling. The actual context, recall, audience, core and exclusivity suites pass on the pinned host. Prefer reusing these facilities over duplicating a semantic retrieval engine. |
| Advanced Memory, normal semantic recall and Long-Term Memory are one system | **Incorrect conflation.** Advanced Memory is a host-managed scene pipeline; normal recall is a separate mode (the exclusivity suite checks those two switches); Long-Term Memory is a registered package runtime. Do not infer that all three should be enabled or that evidence for one proves the others. |
| Native pre-prose recall removes F1's required-memory problem | **Not established.** The actual complete-request assembler drops optional scene/excerpt recall and returns a usable prompt when it would overflow. The focused probe reproduces this with an active fixed pin retained. The LTM wrapper independently returns null for an absent or failing service. These are legitimate optional-recall policies, not defects, but they are unsuitable as the only protection for a required condition. |
| Historical scene summaries and raw message slices are immutable authoritative archives | **Incorrect as stated.** Advanced Memory exposes update/delete/rebuild operations; records contain generated content and source message IDs/fingerprints. Source fingerprints change with content, selected swipe and visibility. Raw excerpts are assembled from the current eligible source prefix. The core suite exercises corrections, swipes and changed source text. Retained transcript and transfer support are useful, but are not an immutable copy of every accepted Keeper fact/audience/condition. |
| Native participant/POV rules replace Keeper per-row knowledge constraints | **Unsupported.** Native visibility/audience checks are real and tested. They do not automatically map Keeper known_by/not_known_by, claims versus facts, author corrections, negation, successor links or downstream conditions. Merged/narrator prompt visibility must not be mistaken for every character knowing every fact. |
| Native chat export resolves F5 for a new Keeper history format | **Partly valid, overstated.** The host remaps its own supported Advanced Memory records and knowledge anchors, and the core suite exercises native branch/import/export behavior. A direct probe shows its metadata remapper does not remap arbitrary custom archive references. A future Keeper history format still needs exact lineage, scope and integrity tests. This does not allege that current Keeper chat export is broken. |
| Avoiding capabilityDocuments removes the proposed cross-store F3 hazard | **Conditionally useful.** Not introducing that second store avoids that particular dual-write design. It does not establish a lossless cold-history owner, native publication acknowledgement, or safe deletion of existing facts. Prefer investigating already accepted native agent-run snapshots before adding another database. |
| Keeper capacity becomes safe once native recall is on | **Rejected.** Recall can be absent, selective or semantically incomplete. Current Keeper has no approved row-removal transaction. Capacity remains finite; unresolved obligations and causal relationship history can stay necessary long after a scene ends. No row is retired by this disposition. |
| Keeper should retain only “current” facts | **Needs a stronger definition.** Active continuity includes the reason for distrust, its unresolved condition, mixed gratitude/resentment, and past events still governing behavior. A rescue does not establish absolute trust; absence from the scene does not retire a quiet cast member. Keep governing causes as active pins, with exact audiences and conditions. Older optional episode detail can be recalled separately. |
| #7044 proves Keeper injections cannot pollute any native memory path | **Narrow the claim.** The pinned generation route supplies actual conversation history to its LTM call rather than the complete prompt. That does not prove all memory configurations or a new integration are contamination-free. No new native-memory switch is enabled in the paused campaign. |
| The F2 patch belongs to / will ship in v2.5.1 | **Factually unsupported.** The official v2.5.1 tag resolves to `8042ef6ec638801de45b8d82f82cd2dea85f51a4`, released 20 October 2026. Its retrieved agents.storage.ts still has no explicit swipeIndex input and persists `message?.activeSwipeIndex ?? null`. Our review-only patch has not been submitted/merged upstream. Do not tell the owner an official update includes it or apply the c565014 patch to another baseline. |

## Chosen next design boundary

Use **native-assisted retention**: Keeper remains authoritative for active state and exact character knowledge; Advanced Memory is a candidate for optional episodic prose recall. Do not ask a generated scene summary or relevance score to certify removal of a Keeper record.

For lossless cold history, the narrowest next design to challenge is reuse of **already accepted native Keeper run snapshots**, addressed by exact content hash plus validated selected-history lineage. This could avoid a parallel document store and duplicate summarizer. It is not implemented: current capability context returns only previous output, not the required accepted snapshot/lineage resolver. Native run rows can also be overwritten, deleted or remapped, so a run ID alone is insufficient. See PROPOSED_RETENTION_CONTRACT.md for the exact conditions and failure cases. No “latest document”, fuzzy matching, silent backfill or automatic retry is allowed.

The next audit is warranted because removing history from the active checkpoint is a substantive lifecycle/validation change. It must challenge the contract before a runtime implementation encodes the wrong authority model. This is not another request to re-audit the already cleared save-binding patch.

## Verification completed in this disposition

- Attachment manifest: all three supplied files verified before inspection.
- Existing save-binding verifier: 44 manifest files, five candidate hashes, four baseline hashes, exact 302-line patch reconstruction, 179-line regression, isolated apply and non-mutating reapply rejection all pass.
- All five touched host candidate files remain byte-identical to the reviewed ZIP after these checks. Stable Keeper source/native identity checks are included in the verification receipt; no regeneration or edits.
- Five existing host suites pass: advanced-memory-context, advanced-memory-recall, advanced-memory-audience, advanced-memory-core, memory-recall-exclusivity. These run actual host code with synthetic data and local mock providers, not paid model calls.
- Six new focused groups pass in native-memory-boundaries.mjs: small recall inclusion; optional recall omission while an active pin survives; absent LTM; successful versus failed LTM; identical-prose swipe fingerprint separation; native-only versus arbitrary-reference remapping.
- v2.5.1 investigation is **targeted source inspection only**, not runtime, upgrade or compatibility certification. Four pinned files and their hashes are included. Both optional-recall behaviors remain present there, and our explicit-target save interface is absent.
- No full pnpm check rerun is needed for unchanged runtime. Earlier complete candidate checks remain the previously verified result, not newly executed evidence. No Windows/browser/upstream CI/CodeRabbit, live state, semantic extraction, unlimited campaign or archival-retirement success is claimed.

## What remains unresolved

The live near-cap checkpoint is unchanged. No headroom has been recovered here. A fixed active budget cannot hold arbitrarily many simultaneously unresolved facts; a future design must still reject safely when genuinely active state exceeds it. Exact historical storage can grow on disk even if the active prompt is bounded. Safe retirement eligibility, snapshot reachability, required pre-prose dependencies, publication receipts, branch/export/import lineage and real-model selection still need implementation and verification before any claim of bounded long-session operation.

Native v2.5.1 contains broader memory changes; this evidence does not authorize a host upgrade mid-test. Personal RP and World State remain untouched.
