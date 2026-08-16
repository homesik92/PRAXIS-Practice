# Roadmap

## Current phase: design stage — design planning

The repo scaffold is done. The design-planning session (step 3 of
`.claude/skills/dev-workflow/design-methodology.md`) has produced the proposed design
plan below.

**⚠ The plan below is proposed, not approved.** Gate 1 has not been cleared — no design
session starts until the session owner gives an explicit go.

### Where the seed document stands

The methodology's step 2 has the project owner write the seed document, and the design
stage takes it as its single input. No seed document was written here; the design
answers arrived directly in conversation instead. [SEED.md](SEED.md) is a
**Claude-drafted stand-in** capturing those answers, awaiting the project owner's
correction — treat it as a starting point to edit, not as the owner's own statement of
intent. The distinction matters because the seed is what every downstream document is
checked against.

## Proposed design plan

| # | Session | Produces | Model / effort |
| --- | --- | --- | --- |
| 1 | Blueprint extraction | `BLUEPRINT.md` — per test: content categories, weightings, question count, time limit, item formats, drawn from the four study companions. Facts only, no ETS content. | Strongest / high |
| 2 | Requirements | `REQUIREMENTS.md` — what a study session, a timed test, and the progress view each do; accessibility requirements; explicit non-goals. | Strongest / extra-high |
| 3 | Data schema | `SCHEMA.md` — the question-bank file format, the saved-progress record, and the registration mechanism that makes D-4's "add a test without code changes" true. Settles B-1 and B-2. | Strongest / max |
| 4 | Engineering design | `DESIGN.md` — file layout, module boundaries, scoring and timing logic, persistence and its versioning strategy, test approach. | Strongest / extra-high |
| 5 | Adversarial review | Findings from fresh, context-free sessions: data integrity (the progress store), UX/accessibility, and a content-correctness pass on the answer-key process. | Fresh sessions / max |
| 6 | Triage & remediation | Consolidated findings, dispositions, updated docs. | Strongest / high |
| 7 | Visual design | Design brief, tokens, component specs. | Strongest / high |
| 8 | Coding plan | `ROADMAP.md` phases 0–n, walking-skeleton shaped. | Strongest / extra-high |

**Sequencing note.** Session 3 is the load-bearing one and is scheduled at max effort
for that reason: D-4 makes "a fifth test needs no code changes" a hard requirement, and
D-6 puts a live, un-backed-up data store in the browser. Both constraints are cheap to
satisfy in the schema and expensive to retrofit afterwards.

**Session 1 is scheduled first for a reason.** Requirements written before the blueprint
exists would be guesses about test structure, and the whole project's shape — how many
questions, how long, which categories — falls out of facts that are sitting unread in
four PDFs.

## Phases (post-design)

Not yet defined — session 8 produces them.

## Session log

| Date | Session | Outcome |
| --- | --- | --- |
| 2026-08-16 | Repo scaffold & design planning | Created repo (local only, no remote), vendored and adapted the dev-workflow skill, wrote the initial doc set, logged D-1–D-6 and N-1–N-2, filed B-1–B-3, drafted SEED.md. Proposed the 8-session design plan above. **No code written. Plan not yet approved.** |
