# Keeper 4.1.7-rc.1 — audit candidate

**Read-only candidate review; not the live release.** Main remains on Keeper 4.1.6. Do not install or run a paid test before the audit is reviewed.

This branch contains a narrow follow-up: explicit current-evidence authority routing, a complete paired correction example with split scope clauses, a read-only model reminder, and clearer rejection diagnostics. No route coercion or validation relaxation. Personal RP and World State are unchanged.

Baseline: `fb6ad3adf400f77c0cb05de4e9a1d163a0c68a16` (4.1.6). Candidate: `4.1.7-rc.1`, same native identity/schema and reviewed Marinara 2.5.0/c565014 target.

**118 runtime tests, 22 packaging checks and 10 differential cases pass.** The original invalid authority/route combination continues to reject. Deterministic checks and authored examples do not establish model compliance or arbitrary-text entailment. The private actual-failure replay is supplied separately; no private chat/state is published here.

Download [Keeper_4.1.7-rc.1_Audit_Source.zip](Keeper_4.1.7-rc.1_Audit_Source.zip) for portable candidate and baseline source, tests, runtime ZIPs, focused diff and comparison script. Audit source ZIP: 269817 bytes; SHA-256 `a98afa5f6847c5e41be1470b857ac493be6ad5e25fbbba6051108b92415e3332`. Its internal manifest verifies every included file.

See [AUTHORITY_ROUTE_CANDIDATE.md](AUTHORITY_ROUTE_CANDIDATE.md) for scope and commands. The catalog in this candidate branch points only to the candidate branch. The main catalog and all earlier release archives remain unchanged. No automatic update, paid call or user-host change is made by this publication.
