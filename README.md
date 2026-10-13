# Personal Marinara Keeper

An unofficial character-continuity keeper for Marinara Engine. Package version **4.1.0**, native pilot.

The model proposes bounded changes. The runtime carries unchanged records forward and validates one complete checkpoint before publication. Invalid proposals retain the last valid state. Knowledge updates reference exact source excerpts, although interpreting those excerpts still depends on the model.

## Downloads

- `catalog.json`: catalog for Marinara's Download Agents installer.
- `personal-character-memory-v4-1-4.1.0.zip`: the native runtime package.

This repository is intended to host only the public runtime and its download metadata. It contains no roleplay transcripts, private memory seeds, character cards, provider credentials, or user test exports.

## Compatibility and status

- Source-reviewed against Marinara **2.5.0**, builds **7e28236** and **c565014**.
- The manifest allows engine versions >=2.5.0 and <2.5.1. It does not enforce an exact build hash.
- Original build verification: 41 local core/lifecycle checks and 33 asset checks passed.
- A real Marinara installation and live model validation are still pending. This is a pilot, not a campaign-readiness claim.
- This is an unofficial custom package, not an official Marinara release or endorsement.

## Package boundary

The ZIP contains `manifest.json`, `agents.json`, `server.mjs`, `keeper-core.mjs`, `legacy-v4.mjs`, and `sources.mjs`. Its declared permission is `agent-runtime` only. It makes no external request or extra model call and creates no separate database.

The checkpoint is limited to 22,000 canonical characters. Capacity exhaustion stops advancement visibly rather than silently deleting records. There is no automatic archival retrieval. The package is not a combat, inventory, or numerical quest engine.

Installation uses Marinara's supported HTTPS catalog mechanism. A regular agent JSON import cannot install this runtime. The matching personal preset and private setup materials are distributed separately.

Runtime ZIP SHA-256:

`6da511b135de568d24641865d81e475519b12776cf5318ec6868cce6788130e5`
