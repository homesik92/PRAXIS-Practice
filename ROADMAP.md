# Roadmap

## Current phase: design stage — session 1 complete

The repo scaffold is done, the compressed design plan is **approved** (D-7), and design
session 1 (blueprint extraction) is complete — see [BLUEPRINT.md](BLUEPRINT.md).

**Next: session 2 (requirements + data schema).** One fork is open and should be settled
before it starts — the question-format question in BLUEPRINT.md, since it determines
what an answer record looks like in the schema.

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
| 2 | Requirements + data schema | `SCHEMA.md` — what a study session, a timed test, and the dashboard each do; the question-bank file format; the saved-progress record including D-8's attempt history; the registration mechanism that makes D-4's "add a test without code changes" true; accessibility requirements; explicit non-goals. Settles B-1 and B-2. | Strongest / max | ☐ Next |
| 3 | Adversarial review | Findings from fresh, context-free sessions on the two failure modes that matter here: progress-store data integrity, and UX/accessibility of a timed, keyboard-driven test runner. | Fresh sessions / max | ☐ |
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
