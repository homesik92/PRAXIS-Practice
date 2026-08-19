# Decision Index

Maps each subsystem/topic to its currently-authoritative decision chain in
`DECISIONS.md`. Update this in the same change as any log append. Consult this first;
read the full log only when a topic isn't indexed yet.

| Topic | Governing decisions |
| --- | --- |
| Repo/process setup | D-1 |
| Remote, hosting target, deployment | D-2 → **D-16** (public GitHub remote created; NAS is production-only) |
| Methodology (PR/CI/issue-tracker language) | D-2, N-1 → **D-16** (restored to full strength) |
| Deferred-work tracking | N-1 (BACKLOG.md) → **D-16** (GitHub issues #1–#10) |
| Tech stack, build step, dependencies | D-3 |
| Test coverage & bank extensibility | D-4 → **N-3** (confirmed, 411 questions) → **D-23** (5165 authored first, to full depth; each bank is 3× the real exam length, not 1×) → **D-24** (5101/5485/5652 authoring paused until after launch) → **D-25** (`enabled: false` only affects starting a new attempt, never review/resume access) |
| Content-authoring order & per-test bank depth | N-3 → D-23 → D-24 |
| Disabled-test review/resume access | **D-25** (`loadManifest`'s `includeDisabled` option; only S1's start-a-new-test list filters to enabled) |
| Question provenance & ETS copyright | D-5 |
| v1 feature set | D-6, **D-8** (spaced repetition) |
| Saved-progress store (schema-change hazard) | D-6, **D-8** |
| Design-stage shape & scope | **D-7** |
| Screen flow | D-9 → D-11 (review pass added) → **D-20** (flag reveals a mid-run Skip) |
| Question format (single- vs multi-select) | D-9 → **D-10** (settled: uniform now, extensible schema) |
| Reference materials during a test | D-12 → D-14 (built scientific calculator, not graphing) → D-21 (5165 reference-panel content schema settled, §2.9) → **D-22** (5485 reference-panel content schema settled, §2.10 — full periodic table, not a subset) |
| Question-bank file format | SCHEMA.md §2.1–2.7 → **D-13** (session 3 remediation) |
| Progress store & spaced repetition | D-6, D-8 → SCHEMA.md §2.8 → **D-13** (resumability, cross-tab, audit trail, SR bootstrap, storage failures, export, retention) → **D-19** (`questionOrder`) → **N-4** (SM-2 ease deltas pinned) → **N-5** (shortfall audit recomputes fresh, no stored cross-check) → **N-6** (review-pass edits: SRS correction from a frozen baseline, immediate persist) → **D-26** (restore/"upload progress" replaces the whole store, never merges) |
| Review pass (flag, reopen/change answer) | D-11 → SCHEMA.md §1.1 S3, §2.8 → N-6 → **D-20** (flag-then-Skip, empty-`chosen` answer records) |
| Adversarial review & triage | **REVIEW.md**, D-13 |
| Notation & code rendering | SCHEMA.md §2.6 — recommendation → **D-21** (MathML support verified, closes issue #2; `format` dispatch implemented for the reference panel only, question rendering retrofit deferred to a new issue) |
| Test blueprints (weightings, timings) | BLUEPRINT.md (not a decision — extracted fact) |
| 5165 calculator scope (built, scientific, not graphing) | **D-14** |
| Coding plan structure (file layout, phasing, parallel content track) | **D-15** → ROADMAP.md |
| Local verification gate | ROADMAP.md Phase 0.1 → CLAUDE.md "Verification" |
| `file://` support (data-loading format) | **D-17** — not required; `.json` + `fetch()` stands |
| Weakest-category practice suggestion (S2) | **D-18** |
| Attempt record shape — résumé (`questionOrder`) | **D-19** |
| Prior 185-question Mathematics set | N-2 |
