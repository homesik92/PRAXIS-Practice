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
| Test coverage & bank extensibility | D-4 → **N-3** (confirmed, 411 questions) |
| Question provenance & ETS copyright | D-5 |
| v1 feature set | D-6, **D-8** (spaced repetition) |
| Saved-progress store (schema-change hazard) | D-6, **D-8** |
| Design-stage shape & scope | **D-7** |
| Screen flow | D-9 → **D-11** (review pass added) |
| Question format (single- vs multi-select) | D-9 → **D-10** (settled: uniform now, extensible schema) |
| Reference materials during a test | D-12 → **D-14** (built scientific calculator, not graphing) |
| Question-bank file format | SCHEMA.md §2.1–2.7 → **D-13** (session 3 remediation) |
| Progress store & spaced repetition | D-6, D-8 → SCHEMA.md §2.8 → **D-13** (resumability, cross-tab, audit trail, SR bootstrap, storage failures, export, retention) |
| Adversarial review & triage | **REVIEW.md**, D-13 |
| Notation & code rendering | SCHEMA.md §2.6 — recommendation **unverified**, see B-4 |
| Test blueprints (weightings, timings) | BLUEPRINT.md (not a decision — extracted fact) |
| 5165 calculator scope (built, scientific, not graphing) | **D-14** |
| Coding plan structure (file layout, phasing, parallel content track) | **D-15** → ROADMAP.md |
| Local verification gate | ROADMAP.md Phase 0.1 → CLAUDE.md "Verification" |
| `file://` support (data-loading format) | **D-17** — not required; `.json` + `fetch()` stands |
| Weakest-category practice suggestion (S2) | **D-18** |
| Prior 185-question Mathematics set | N-2 |
