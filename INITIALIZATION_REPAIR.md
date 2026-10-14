# Keeper 4.1.3 — initialization repair

A live first-save proposal exceeded the three-ID evidence limit in more than one item. It also used disclosures without grounded sender access. Validation protected memory, but another unchanged paid retry was not a sufficient repair.

## Changes

- Each change/access item accepts 1–6 evidence IDs. Every supplied ID is resolved and checked for its scope. At least one selected source must itself be current and eligible for the operation; freshness and authority cannot be combined from different ineligible sources. The prepared context advertises the same six-ID bound. Nothing is silently truncated.
- Preflight checks list bounds across both arrays and combines their diagnostics before compiling any mutation. It displays up to four errors and a count of additional errors. Empty/non-array lists and seven-ID lists reject.
- A disclosure group containing its sender among its recipients rejects with the item path. The compiler never removes that recipient or invents sender access.
- The prompt gives executable examples of hearing an unverified report (`heard` via `claim`) and receiving grounded information (`disclosed` from an independently supported holder). It addresses absent listeners, barriers, whispers and same-transaction sender grounding. Example IDs must be replaced by real runtime IDs.

## Preserved boundaries

`keeper-core.mjs`, `legacy-v4.mjs`, `evidence.mjs` and `sources.mjs` are unchanged from 4.1.2. Atomic rejection, omission carry-forward, current author corrections, whitespace-only compaction, protected-field and shrink guards, successor audiences, disclosure dependency checks, capacity limits and bounded recovery remain in force. The existing claim route still cannot grant `knows` or bypass an explicit exclusion. No automatic repair call, silent eviction or extra model is added.

Evidence validation remains structural. The model must still interpret the actual speaker, proposition, recipients and conditions correctly. Six valid IDs do not prove a statement is true. Prompt examples improve guidance; they do not establish live reliability.

The native identity and `character_memory.v4.1` schema are unchanged. Context supply stays 24, normally selecting eight prior messages; output allowance stays 8,888 tokens. Personal RP v4.1 prose and World State are untouched.

## Verification

**72/72 deterministic tests pass**, including all 58 prior regressions and 14 new tests for four/six-ID acceptance, combined count errors, invalid fourth/fifth/sixth IDs, stale/current authority, heard-report initialization, grounded disclosure, sender/recipient separation, explicit exclusions, historical first-reply recovery and the actual shipped prompt examples. **19/19 package checks pass.** Prior archives remain immutable.

The earlier live export lacks its prepared evidence catalog, so a reconstructed private diagnostic is not described as an exact end-to-end live replay. No paid model call is used for verification. Full installed-host behavior and live model compliance remain the short test gate.

## Upgrade and test

Update the same native package, restart Marinara, press **Apply v4.1.3 settings**, and refresh the page. The selected connection and saved memory remain in place. Do not import the text prompt as a replacement for the runtime.

For a short existing chat with no successful initialization, target the original first generated assistant reply using the host's historical retry API. Normal rerun controls target the latest reply and cannot be assumed to select an arbitrary earlier one. Confirm revision 1 before processing later accepted replies in order. Do not regenerate prose or paste a seed merely to work around a rejected first proposal.

Continue only after initialization, then check 3–5 consecutive saved updates. A failed update retains the accepted checkpoint. Larger casts, semantic compression, archival, inventory/combat/quest authority and campaign readiness remain outside this release.
