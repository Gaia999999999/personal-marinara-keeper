# Keeper 4.1.7 — authority routing repair

This stable release promotes the independently audited **4.1.7-rc.2** implementation at `ea19c0667cbd76d2fd5a342ddd14f929a27ea2a8`. The focused audit is closed. Promotion changes only version/protocol labels, descriptive metadata and packaging targets; the reviewed prompt is byte-identical. No new validator behavior is introduced during promotion.

Compared with stable 4.1.6, the prompt distinguishes the authority of current evidence from the character's earlier experience. An explicit current author restoration uses `author_correction`; current in-world first-hand experience can use `self`. A complete custody/conditional-plan example shows the actual three evidence chunks from one source, including a shared boundary chunk. The model-facing reminder and rejection diagnostic explain the distinction without converting a rejected route into an accepted one.

The original rc.1 example declared four disjoint spans, and its synthetic test replaced the source catalog. The audited follow-up corrects that prompt/test gap using real `prepareContext` output. No source-authority expansion, relaxed predicate, route coercion, cap increase, automatic truncation, partial commit or silent state eviction was added. Existing strict rejection, atomicity, preservation and audience guards remain.

Local verification: **125 runtime tests, 22 packaging checks and 23 promotion-equivalence checks**. Seven core modules are byte-identical to rc.2; server/client differences are version/protocol strings only; tests differ only in release references. The earlier ten differential scenarios across three versions and real-chunk comparison remain audit evidence. These checks involved no paid model call or installed-host execution.

Known semantic limitations remain. An eligible source kind does not prove its text supports a proposition or audience. Mis-cited acknowledgment text and unrelated current author clauses can pass structural eligibility. Natural-language scope/status interpretation and complete multi-span provenance still need review of the raw proposal as well as the checkpoint. These are reproduced inherited limitations, not tests of successful semantic protection and not fixed by this release.

Target: Marinara **2.5.0 / c56501495a8baf76c258e76534c8728a9b7859bb**. Package identity remains `personal-character-memory-v4-1`; schema remains `character_memory.v4.1`. Update the existing native package, fully restart Marinara, refresh the browser, apply **v4.1.7 settings** in the Keeper panel, then refresh again. Model connection, sampling preferences and saved memory are retained. Personal RP v4.1 and World State are unchanged.

Runtime ZIP: **39,573 bytes**, SHA-256 `299c4a033d85d42ab3d33630055617b3074091f8d7bac47dbc8f769808a8440d`. The stable catalog targets main. Frozen audit branches and prior stable archives remain historical evidence. This repository contains generic code, prompts and regressions; private chats, review exports, retry helpers and user-specific instructions are excluded.

The next gate is one explicitly approved, supervised live correction and review of persistence **and** semantics. Local checks do not authorize an unattended retry or establish long-campaign readiness.
