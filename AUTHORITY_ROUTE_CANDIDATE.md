# Keeper 4.1.7-rc.2 — focused audit follow-up

Read-only review candidate. Stable main remains 4.1.6; the separately pinned rc.1 remains frozen. No installation, user-chat operation, live provider call or release promotion is authorized by this archive.

The only substantive follow-up to rc.1 is the complete prompt example and its tests. The example now documents one exact current OOC source, the three chunks actually emitted by prepareContext, and a middle chunk deliberately cited by both the custody/access item and the private conditional-plan item. It does not change chunking, evidence authority, acceptance predicates, limits, schema or architecture.

The previous example used four declared symbolic spans and a test that replaced the prepared source catalog. That authored contract passed, but did not represent the real chunk pipeline. The new test leaves the prepared catalog intact and resolves only symbolic example IDs and the turn placeholder. A second test commits the full example and verifies old memory, proposed status, timing/conditions and limited audiences.

Seven runtime modules are byte-identical to rc.1, including transaction.mjs, evidence.mjs and keeper-core.mjs. Server/client differences are only version/protocol strings; the rc.1 authority reminder and diagnostics are unchanged. Personal RP and World State are outside this package.

Directories:
- baseline416/: stable source and runtime at fb6ad3adf400f77c0cb05de4e9a1d163a0c68a16.
- reviewedRc1/: the audited source and runtime at fda570f6107251e8f630e0aa0cf142715b565f0a.
- candidate/: 4.1.7-rc.2 source/tests/runtime.
- CHANGES_FROM_RC1.patch: focused prompt/test/version differences.

Verification: 125 runtime tests (117 retained unchanged, one old example test replaced by two real-pipeline tests, six additional audit controls), 22 packaging checks, and ten differential scenarios across all three versions. compare-example-chunks.mjs reproduces rc.1's mismatch and confirms rc.2's overlap using real preparation. No provider calls or model-compliance claims.

Run locally, with Node and npm already available; no dependency installation:

    cd candidate
    npm test
    cd ..
    node compare-runtimes.mjs
    node compare-example-chunks.mjs

The private case and lead disposition are supplied separately. Do not publish them. Their reproduction deliberately rebinds the short turn token because live preparation was not exported; it is not exact captured-input replay or a saved user checkpoint.

Known limitations remain: an eligible source kind does not prove that the text supports the proposition or recipient. A current acknowledgment can therefore satisfy the structural in-world-kind test if mis-cited; unrelated current author text can satisfy the author-kind test; natural-language exclusions and proposed status on new records still require correct model interpretation. Complete multi-span evidence is not fully retained in checkpoint provenance. These are reproduced inherited acceptance gaps, not fixed by rc.2, and not counted as successful semantic safety tests. Review the raw proposal as well as the saved checkpoint before any later story continuation.

The requested recheck is narrow: real chunk fidelity, shared-boundary citation, untouched validation/atomicity/audience guards, and accurate reporting of remaining limits. Do not redesign the architecture, modify the repository, install the candidate or run a paid test. Return concrete findings to the lead for disposition.
