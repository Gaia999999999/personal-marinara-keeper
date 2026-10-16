# Keeper 4.1.7-rc.1 — read-only audit source

This is a prerelease candidate. Do not install it, update the live catalog, run a provider, or alter the paused user chat. Baseline is the published Keeper 4.1.6 source at fb6ad3adf400f77c0cb05de4e9a1d163a0c68a16.

The change clarifies current evidence authority for author_correction versus self; shows a complete custody plus conditional-plan restoration; explains clauses crossing evidence chunks; adds a read-only runtime reminder and an actionable rejection diagnostic. It does not convert routes or change acceptance rules.

Six runtime modules are byte-identical: keeper-core, legacy-v4, sources, evidence, scene-boundary and retention. transaction.mjs changes diagnostic construction only. Remaining runtime edits are the reminder, protocol/version and metadata. Checkpoint schema, architecture, current-source eligibility, bounds, audience rules, atomicity and whitespace-only compaction stay unchanged. Personal RP and World State are outside the candidate.

The candidate contains 118 passing runtime tests: 109 retained, five promoted review cases, four focused example/reminder/diagnostic cases. Packaging has 22 passing checks. Ten differential cases compare acceptance and resulting state with 4.1.6. These are deterministic checks, not model compliance, latency, installed-host or semantic-entailment evidence. The new prompt is 22,694 characters versus 18,741; assess whether the additional guidance is clear and proportional. The private actual-failure case is supplied separately and is not in this public source archive.

Directories:
- candidate/: candidate source, tests, package, runtime ZIP, catalog and verification.
- baseline416/: baseline source/tests/package for comparison.
- CHANGES.patch: focused source, prompt and test changes. Generated agents/manifest metadata can be compared directly.
- compare-runtimes.mjs: portable synthetic differential check.

Local commands for an auditor with Node available (no npm install required):

    cd candidate
    npm test
    cd ..
    node compare-runtimes.mjs

The private case's replay.mjs accepts this expanded archive folder as its argument. It reconstructs the prepared context and explicitly rebinds the local short turn token; the live prepared context was not exported. It does not write or import a checkpoint.

Read-only audit means no repo edits, release promotion, user-chat edits, installation or paid calls. Temporary local counterexample scripts are welcome. Report reproducible violations separately from inherited semantic/model-compliance limitations. A structurally valid reference or route does not prove arbitrary natural-language entailment. Prompt guidance about acknowledgments is not a new deterministic acknowledgment classifier.
