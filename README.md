# Personal Marinara Keeper

**Current package: 4.1.1 — reliability repair.** Target: Marinara **2.5.0**, source reviewed at build **c565014**. Local checks pass; live model and installed-UI validation are pending. This is a personal pilot, not an official Marinara package or a campaign-readiness claim.

Catalog: https://raw.githubusercontent.com/Gaia999999999/personal-marinara-keeper/main/catalog.json

Update the existing `personal-character-memory-v4-1` package through Marinara's native catalog flow, then fully restart Marinara and refresh its browser page. The package identity and preset link are unchanged. In its Tracker Panel, expand **Update setup**, press **Apply v4.1.1 settings** while agents are idle, and refresh once more. This restores the packaged prompt and sets the 24-message recovery supply pool; it preserves the selected model connection and saved chat memory. It is not a standalone agent JSON import.

The repair uses short evidence IDs and a uniform transaction format. Code carries omitted records, validates a complete bounded checkpoint, preserves earlier audiences when a state changes, distinguishes explicit OOC correction from in-character text, and rejects invalid output without replacing the prior checkpoint. Normal evidence uses eight prior messages; bounded recovery can use up to 24. The output allowance remains 8,888 tokens.

The new panel reports the host's last recorded successful save and newer reply count. It does not verify the selected swipe or show the checkpoint revision. Inspect the injected checkpoint for that; detailed errors remain in Agents. The panel makes no model calls. Its settings button only writes after a user click.

Local verification: 28 deterministic tests and 19 packaging checks pass, plus a private hand-authored regression replay. No live provider speed/reliability claim is made. Browser rendering could not be checked locally because the Chromium download failed. The next gate is fresh initialization plus 3–5 consecutive accepted updates on a small-cast chat.

The checkpoint remains bounded at 22,000 characters. Compaction preserves protected records, but semantic correctness still depends on the model. Unique growth can exhaust capacity; there is no archive or silent eviction. Full mechanics and large-campaign readiness remain outside this release.

`source/` contains reproducible generic runtime source and synthetic tests. Run `node --test tests/run.mjs tests/status.mjs` there; `python build.py` creates the native ZIP and catalog locally. Older runtime archives remain available for historical reference. This public repository contains no private chats, character cards, preset content or private audit fixtures.
