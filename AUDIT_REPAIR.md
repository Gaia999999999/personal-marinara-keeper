# Keeper 4.1.2: disposition of the 4.1.1 adversarial audit

The audit found real blockers. Its supplied counterexample script reproduces against the frozen 4.1.1 payload at commit `30fc477bebd003bb402e508b575a534d85a6f20a`. All eight frozen runtime payloads were independently matched to the published ZIP. Review and regressions ran on Node 24.19.0; the auditor reported Node 18.20.4. The auditor's environment claim was not independently reproduced.

We did not accept the recommendation to proceed with caveats: preserving a prior checkpoint when an update is rejected does not protect against a destructive update that is accepted. Paid playtesting should use this repair, not work around known 4.1.1 failures.

| Finding | Disposition in 4.1.2 |
| --- | --- |
| F1: OOC boundaries | Confirmed. Multiline tags now close at the matching tag or true end of input; bare OOC consumes one line. Following roleplay stays ordinary user evidence. |
| F2: authority and freshness split across IDs | Confirmed. The selected supporting source must itself be current and eligible for the operation. Current unrelated card text cannot make an old scene current; an old OOC span cannot borrow current user authority. Eligible sources work in either array order. |
| F3: compaction rewrites/erases meaning | Confirmed. A percentage floor alone is inadequate: even a shorter sentence can invert a fact. Baseline-authorized compact now permits only exact whitespace normalization that makes the text shorter. Words and punctuation remain intact. |
| F4: generic receipts bypass protection | Confirmed. Ordinary updates cannot clear established cast details or plan timing/location to null. Protected trait, relationship and plan-action text cannot lose more than 40% through ordinary set. Current explicit author correction remains available. This is a structural loss guard, not proof that every natural-language update preserves all qualifiers. |
| F5: receipt overflow, growth and quiet-turn failure | Confirmed. Up to 48 distinct receipts match 24 changes plus 24 access entries. Receipts store the source identifier rather than copying the quotation. Cosmetic-only compaction needs no receipt. Continuity size comparisons exclude transient receipts; old bulky receipts can expire without looking like domain loss. The total 22,000-character ceiling still applies. |
| F6: successor kind override | Confirmed. Advance preserves kind; validation requires both ends of a successor link to be state/belief. Invalid or forked chains are rejected. |
| F7: advance shape | Confirmed usability mismatch. The previous operation-specific instruction did require fact and truth, but the general changed-fields-only rule conflicted. Advance now inherits omitted values and permits changed fact and/or truth, including truth-only verification with a fresh audience. |
| F8: disclosure ordering | Confirmed. Access applies non-disclosures first, then grounded disclosure dependencies, independent of input order. Multi-hop disclosure is supported; ungrounded cycles and heard-to-knows escalation fail. Explicit revocation is applied before a dependent disclosure. |
| F9: retry and first-save recovery | Partly confirmed. Already-committed preparation gets a specific diagnostic. The pinned host normally excludes the target reply from loadPreviousOutput, so the audit's latest-save mock is not the normal retry path. The host supplies 24 messages including the retry target, so the usable prior pool can be 23; the package cannot restore a missing host message. Failed initialization still requires retrying the first reply or an audited fresh start, not a partial-history rebuild. |
| F10: seeds and successor IDs | ID collision and fork acceptance confirmed and fixed. A pasted seed deliberately does not override an existing selected save. Recovery requiring an audited seed must use a genuinely fresh chat with no inherited keeper output; a branch may still inherit output. Automatic higher-revision seed replacement was not adopted. |
| F11: diagnostics/settings/short evidence/UI color | Incorrect unloaded-status wording, incomplete settings reset and short-text omission fixed. The unused green CSS rule was removed. A last-recorded-save badge remains neutral because it does not verify selected-swipe freshness. |

The settings upgrade now resets includePreGenInjections, includeParallelResults, triggerLorebooksForAgentCalls and enabledTools alongside the existing source switches. The model connection and unrelated sampling preferences stay in place.

## Evidence and replay

Run `node --test tests/run.mjs tests/status.mjs tests/audit.mjs` from `source/`. All 58 tests pass. The audit file includes both positive acceptance cases and negative bypass cases, including the full 48-receipt budget, near-cap cosmetic compaction, stale mixed evidence, quiet turns after bulky legacy receipts, and recovery on the next reply after a rejected update. Negative transaction tests check that the baseline remains unchanged.

The private Pinewatch replay still commits a hand-authored #11 handoff from the #3 checkpoint, preserves the older audience, loads its wrapped result for the next update and includes all six pending replies through #15. The audience assertion now compares sorted identities because disclosure processing is deterministic; this changes comparison order, not the expected recipients. Eight old-format failed proposals remain rejected. Private fixtures are not included in this repository. These checks are not live model repairs or a complete audited continuation seed.

The 19 asset checks verify the native package contract, packaged prompt/settings, ZIP contents and all payload hashes. No live provider call, actual Windows install or rendered Marinara UI was performed here.

## Limits and focused re-audit

Please inspect the implementation and try concrete counterexamples, especially: stale/current evidence mixing; semantic changes disguised as compact; ordinary set clearing or drastic shrinking; receipt expiry versus domain loss; disclosure cycles/revocations; successor collisions/forks; and recovery after rejection. Report the exact transaction, baseline, expected result and actual result. No repository editing is needed.

The stricter compaction policy intentionally defers generative semantic compression. A genuine change may be shorter than its old state because advance retains the earlier observation; compaction does not have that safeguard and cannot paraphrase it. Omitted records are preserved, but an evidence-backed natural-language interpretation can still be wrong. Static author notes are ongoing explicit author authority while present. Capacity can still stop saves. Broader archive design, branch UI verification, mechanics ownership and provider comparisons remain separate work.

After any focused blocker recheck, use a fresh small-cast chat for initialization plus 3–5 consecutive accepted updates. Inspect revisions and private audiences before increasing test length.
