# Keeper 4.1.7-rc.2 — focused audit follow-up

**Read-only candidate; not the stable release.** Main remains 4.1.6. No installation or paid call is authorized.

This follow-up closes the audited prompt-example/test gap: the complete correction now uses actual chunks from one OOC source and deliberately shares the boundary chunk between both records. The regression uses real prepareContext output, not a replacement evidence catalog. Seven core modules, including transaction.mjs, are byte-identical to rc.1; all authority/acceptance/atomicity/audience predicates and limits remain unchanged. Personal RP and World State were not edited.

**125 runtime tests, 22 packaging checks and ten differential scenarios across three versions pass.** A real-pipeline comparison reproduces rc.1's mismatch and confirms rc.2. These checks do not establish live model compliance or semantic entailment. Reproduced inherited semantic acceptance gaps remain explicit review limitations.

Reviewed rc.1: `fda570f6107251e8f630e0aa0cf142715b565f0a`. Stable 4.1.6: `fb6ad3adf400f77c0cb05de4e9a1d163a0c68a16`. Both remain unchanged.

[Keeper_4.1.7-rc.2_Audit_Source.zip](Keeper_4.1.7-rc.2_Audit_Source.zip) contains all three source/runtime versions, regressions, focused diff and comparison scripts. Bytes: 402626; SHA-256 `61f498efa6548629a82f740288575f0deafe16e908b7aae9ef485048904ecdaa`. See [AUTHORITY_ROUTE_CANDIDATE.md](AUTHORITY_ROUTE_CANDIDATE.md) for commands, limits and the narrow recheck scope.

Private user material is supplied separately and is excluded from this repository. The next gate is a focused read-only recheck, followed by the lead's disposition; the main catalog is unchanged.
