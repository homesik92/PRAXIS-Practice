# Roadmap

## Current phase: design stage — session 3 complete, one fork awaiting the session owner

Scaffold done, compressed design plan approved (D-7), and design sessions 1–3 complete —
[BLUEPRINT.md](BLUEPRINT.md), [SCHEMA.md](SCHEMA.md), [REVIEW.md](REVIEW.md).

**One item blocks session 4 from starting clean:** the 5165 calculator fork (B-7,
REVIEW.md "Escalate"). Session 4 (coding plan) can begin regardless — the fork changes
phase sizing, not the phase structure — but it should be resolved before that plan is
called final.

### Where the seed document stands

The methodology's step 2 has the project owner write the seed document, and the design
stage takes it as its single input. No seed document was written here; the design
answers arrived directly in conversation instead. [SEED.md](SEED.md) is a
**Claude-drafted stand-in** capturing those answers, awaiting the project owner's
correction — treat it as a starting point to edit, not as the owner's own statement of
intent. The distinction matters because the seed is what every downstream document is
checked against.

## Approved design plan (D-7)

| # | Session | Produces | Model / effort | Status |
| --- | --- | --- | --- | --- |
| 1 | Blueprint extraction | [BLUEPRINT.md](BLUEPRINT.md) — per test: content categories, weightings, question count, time limit, stated item formats. Facts only, no ETS content. | Strongest / high | ☑ Complete |
| 2 | Requirements + data schema | [SCHEMA.md](SCHEMA.md) — screens and behavior; the question-bank file format; the saved-progress record including D-8's attempt history; the registration mechanism that makes D-4's "add a test without code changes" true; accessibility requirements; explicit non-goals. Closes B-1 and B-2. | Strongest / max | ☑ Complete |
| 3 | Adversarial review | [REVIEW.md](REVIEW.md) — 19 findings from fresh, context-free sessions on progress-store data integrity and runner UX/accessibility; 18 remediated directly in SCHEMA.md, 1 escalated (5165 calculator, B-7). | Fresh sessions / max | ☑ Complete |
| 4 | Coding plan | Phases 0–n below, walking-skeleton shaped. | Strongest / extra-high | ☐ |

**Session 2 is the load-bearing one** and is scheduled at max effort for that reason.
Three separate constraints all land in it and are each expensive to retrofit: D-4 makes
"a fifth test needs no code changes" a hard requirement; D-6 and D-8 put a live,
un-backed-up store with per-question attempt history in the browser; and BLUEPRINT.md's
F-4 and F-6 mean the category model must be a variable-depth tree with orthogonal
overlay tags, not a flat two-level scheme.

**Why the eight-session version was cut to four:** see D-7. In short, the deliverables
that were dropped (API spec, operations/cost review, staged-exposure planning, a
standalone visual-design pass) have no subject matter in a static single-user offline
site with no server.

## Phases (post-design)

Not yet defined — session 8 produces them.

## Session log

| Date | Session | Outcome |
| --- | --- | --- |
| 2026-08-16 | Repo scaffold & design planning | Created repo (local only, no remote), vendored and adapted the dev-workflow skill, wrote the initial doc set, logged D-1–D-6 and N-1–N-2, filed B-1–B-3, drafted SEED.md. Proposed an 8-session design plan; session owner approved a compressed 4-session version (D-7). **No code written.** |
| 2026-08-16 | Design session 1 — blueprint extraction | Extracted all four test blueprints from the study companions; category counts verified to sum to each test's stated total. Produced BLUEPRINT.md with six findings (F-1–F-6). Logged D-7–D-9 and N-3 (411-question v1 authoring load; spaced repetition in scope; screen flow). **One fork left open: question format.** |
| 2026-08-16 | Design session 2 — requirements & schema | Settled the open format fork (D-10: uniform now, extensible schema), added a one-review-pass end-of-run step (D-11), scoped in the two reference panels (D-12). Produced SCHEMA.md: screens S1–S5, form-assembly rules (weight-correct, shortfalls disclosed not backfilled), the variable-depth category tree + overlay axis, the question record (`type`/`correct[]` for painless format extension, `format` discriminator for text/mathml/code), and the progress store with SM-2-style spaced repetition and a mandatory pre-migration backup. Closed B-1, B-2. Filed B-4 (MathML support unverified), B-5 (reference-panel schema), B-6 (backup must land in Phase 0). |
| 2026-08-16 | Design session 3 — adversarial review | Two fresh, context-free reviewers (data integrity; UX/accessibility) found 19 issues against SCHEMA.md and BLUEPRINT.md — both independently flagged the same core gap: "resumable" was a stated requirement with no backing data model. Triaged and remediated 18 directly in SCHEMA.md (résumé/`status` field with per-answer write cadence, cross-tab `storage`-event reconciliation, auditable shortfall targets, SM-2 bootstrap values, visible storage-failure handling, `retired` flag instead of question deletion, progress export, backup retention policy, confirm-before-submit, screen-reader-queryable timer/position, a flag-toggle control, queued announcements, richer review-list rows, non-modal reference panels, first-run orientation copy). Zero rejected. **One escalated** (B-7): D-12's 5165 reference panel quietly narrowed BLUEPRINT.md's F-3 graphing-calculator requirement to a static formula sheet — three options recorded in REVIEW.md, awaiting the session owner. Logged D-13. |
