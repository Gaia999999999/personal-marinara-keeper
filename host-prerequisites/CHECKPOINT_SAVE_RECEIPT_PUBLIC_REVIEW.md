# Checkpoint save receipt — compact public review package

This is a packaging-only public edition of the existing Checkpoint Save Receipt 0.1.0-rc.1 candidate. Candidate files, regressions, patch and source hashes are unchanged. No implementation or expensive regression tests were rerun for publication packaging. Independent Argon engineering review remains pending; main, catalog, installed application and owner state are unchanged.

Download: [Checkpoint_Save_Receipt_0.1.0-rc.1_Public_v1.zip](Checkpoint_Save_Receipt_0.1.0-rc.1_Public_v1.zip)

- Bytes: 980357
- SHA-256: `cbca85affec8840299d6f32c4739197dade7c74e847f7d5753dd1b54a64d64b7`
- Outer manifest entries: 84
- Prior evidence files copied: 55; path/account-redacted copies: 41

The public ZIP includes exact necessary candidate and accepted F2 source overlays, regression sources, the patch, audit/reproduction instructions, pinned identities, license/provenance, verification tools and labeled evidence. EVIDENCE_PROVENANCE.json records original and public digests for each evidence member. Redacted logs are not claimed byte-identical to originals. Numeric/boolean/null result values, source hashes and test outcomes were preserved. Local account identifiers and local absolute paths were removed from public evidence; archive member/content scans and fresh reconstruction checks passed.

The large upstream source archive is omitted. Reproduce from public [Marinara commit c56501495a8baf76c258e76534c8728a9b7859bb](https://github.com/Pasta-Devs/Marinara-Engine/tree/c56501495a8baf76c258e76534c8728a9b7859bb), [pinned archive download](https://codeload.github.com/Pasta-Devs/Marinara-Engine/tar.gz/c56501495a8baf76c258e76534c8728a9b7859bb): 103,585,597 bytes; SHA-256 `4b2a3b305b7a7d9afa6100517a0af841858ea38a8ab659ecac8fdb6260821382`. It is publicly available under AGPL-3.0; the full license and provenance are included. The package's fetch/prepare helpers enforce the archive byte count/hash and exact candidate/F2 identities. Dependency restoration uses the included upstream lockfile after reconstruction and needs registry/cache access.

Supplied prior evidence records the full host check and ten relevant suites passing. tracker-sections failed identically on unchanged F2 and candidate at WORLD_SENTINEL placement, line 201; it remains an observed baseline limitation, not a pass. Early environmental failures remain visible. This public package's fresh-unpack/manifest/hash/source-reconstruction checks are packaging verification, not new runtime passes.

The original complete `Checkpoint_Save_Receipt_0.1.0-rc.1_Audit_v2.zip` remains unchanged locally for Argon's existing independent audit: 104,659,415 bytes; SHA-256 `68fb6c15d9993d4ba2e6605f546b01a96b280b0d0cd41525272eee8b92db16ac`. The original source checkpoint is unchanged. This public edition does not replace that original audit artifact, distribute the supplied independent report, accept an engineering audit, or authorize installation, live/paid testing, migration, retention, promotion, or release.

This review commit is based directly on `a75d362ffcbb9650d95be26f7526779fede77b5b`. The prior unpublished large-package commit is excluded from this publication's history and tree. Only this compact public ZIP and its two public review documents are added.

## Audit gate

Continue the existing independent Argon review with the unchanged complete audit ZIP and its original instructions. Public readers can independently reproduce this candidate using START_HERE.md, ARGON_BRIEF.md, PUBLIC_SOURCE_REFERENCES.json and the hash-verified public source. Separate executions, source inspection and supplied redacted evidence. No independent engineering verdict is implied by publication-suitability review.
