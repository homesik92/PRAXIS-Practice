# Backlog

This project has no GitHub issue tracker (local git only — see `DECISIONS.md` D-2), so
deferred work lives here instead. The rule from
`.claude/skills/dev-workflow/SKILL.md` still holds: **file the entry when the work is
discovered, not at close-out.**

Entries are numbered `B-n` and dated. Each needs enough context to act on cold, months
later, without this conversation. Completed entries stay in the list, struck through,
with a one-line note of what closed them.

| ID | Date | Entry | Status |
| --- | --- | --- | --- |
| ~~B-1~~ | 2026-08-16 | ~~Decide whether a fifth+ test can be added by dropping in a bank file alone, or needs code changes.~~ | **Closed** — SCHEMA.md §2.1–2.2: a manifest entry plus a bank file, no code changes. Holds only while no test code appears in source. |
| ~~B-2~~ | 2026-08-16 | ~~Decide the notation/code rendering approach for 5165, 5485, and 5652.~~ | **Closed** — SCHEMA.md §2.6: a `format` discriminator (`text` / `mathml` / `code`). See B-4, which carries the unverified part forward. |
| B-3 | 2026-08-16 | A prior set of ~185 Mathematics (5165) questions was authored in an earlier session and could not be located on this machine (Desktop, Documents, Downloads, and all Claude Code transcripts searched). If it resurfaces, evaluate importing it — but review every item against the answer-key and ETS-copyright standards in Gate 3 before accepting any of it. | Open — blocked on the file resurfacing |
| B-4 | 2026-08-16 | **Verify browser MathML support against current official docs before authoring the first Mathematics question.** SCHEMA.md §2.6 recommends inline MathML because it needs no library (D-3), but that recommendation is unverified — from training data — and it is the least-confident choice in the schema. If it does not hold up, the fallback options are a small in-project LaTeX-subset renderer or pre-rendered SVG, both of which change the authoring workflow. Cheap to check now; expensive after 66 Math questions exist. | Open — blocks 5165 and 5485 authoring |
| B-5 | 2026-08-16 | Design the reference-panel content schema for D-12 (5165 formulas/notation, 5485 periodic table and constants). SCHEMA.md treats `reference/*.json` as a placeholder shape. This content is authored for this project, not reproduced from the study companions. | Open — blocks 5165 and 5485 authoring |
| B-6 | 2026-08-16 | The progress-store backup mechanism (SCHEMA.md §2.8 — copy to `praxis-practice.backup.v{n}` before any migration) must land in **Phase 0**, not when the first migration is needed. It is the only safety net for the one un-backed-up data store in the project. | Open — Phase 0 requirement |
