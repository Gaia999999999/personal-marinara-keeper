# Keeper 4.1.11 — release record

Released 19 October 2026. Native package `personal-character-memory-v4-1`; Marinara 2.5.0 / c565014.

## Implementation basis

Promoted from reviewed 4.1.11-rc.4. All eleven enforcement modules, including storage and admission, are byte-identical to that candidate. Server, client, agent definition and prompt changes are release/version labels only. No new behavior was introduced during promotion.

## Scope

- Self-contained lossless checkpoint storage reduces repeated representation overhead. It preserves decoded records, identities, audiences, exclusions, conditions and provenance. The full stored envelope remains subject to the 22,000-character cap; decoded field and row limits remain enforced.
- Bounded admission checks cover supported custody/observation/conditional-plan patterns. The final reviewed repairs close the tested before-asset negation and wh-/single-quoted question authority gaps, including current evidence split across contiguous same-origin spans.
- Rejection remains atomic. Accepted memory is retained after unsupported changes. Supported later moves can be accepted against the same retained baseline without relaxing audience or predecessor protections.
- Existing current-evidence, author-correction, quiet-cast, unresolved-plan and recovery rules remain. Prose and World State are unchanged.

## Limits and compatibility

This is finite headroom recovery, not bounded campaign retention. The ledger still holds at most 36 records. No retirement, archive, semantic merge, automatic retry, silent eviction or enlarged cap was enabled. Already-omitted continuity is not reconstructed automatically.

The admission rules deliberately recognize a bounded set of forms. Some aliases, scene-prefixed/present-tense NPC placements, carried-without-destination transitions and contrastive destination tails can conservatively reject. The rules do not establish arbitrary semantic entailment.

Older Keepers cannot read packed checkpoints. Save a pre-update chat export and keep the matching runtime once a packed checkpoint is saved. Installation/settings changes alone do not migrate accepted history. No live checkpoint was changed by release preparation.

## Verification

| Check | Result |
| --- | --- |
| Reviewed rc.4 source/native suite | 300 / 300 each |
| Stable source suite | 300 / 300 |
| Stable exact extracted-native suite | 300 / 300 |
| Native package checks | 27 / 27 |
| Promotion scope, integrity and syntax | 106 / 106 |
| Replay/audit groups, both source and native | 14 + 8 + 8 + 9 passed |
| Final auditor full-finalization probes | 18 rejected atomically; supported subsequent moves passed |
| Deterministic native rebuild | Exact byte match |

Native archive: `personal-character-memory-v4-1-4.1.11.zip`.

- Bytes: `56048`
- SHA-256: `454357ecdccf56295ca3ea5c88f198e2e5c960c15790015e67064cf793cd8570`
- Reviewed rc.4 SHA-256: `115604f7f6e583dcc868b02806334178f4be20ec16f4945c71db343758db1cb0`

The public repository contains generic source/regressions and installable packages. Private replay material is excluded. Offline checks do not certify live provider compliance, latency, future capacity or arbitrary linguistic cases.
