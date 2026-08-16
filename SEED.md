# Seed Document — PRAXIS-Practice

> **⚠ This is a Claude-drafted stand-in, not the project owner's own document.**
> The methodology (`design-methodology.md`, step 2) has the project owner write the seed
> as a distillation of their ideation notes, and every downstream design document gets
> checked against it. This draft only captures the answers given in the scaffold
> session, so it inherits whatever the conversation left unsaid — and the gaps are
> listed at the bottom rather than guessed at. **Edit it freely; it is meant to be
> overwritten.**

## Motivation

Preparing for Praxis Subject Assessments needs practice under something like real
conditions — a full-length test against a clock, and targeted drilling on weak areas
between attempts. Commercial prep sites gate this behind subscriptions and accounts.
This project builds a self-hosted alternative that runs on the home network, keeps its
data on the machine using it, and costs nothing to keep running.

## Goals

1. **Take a realistic timed test.** Match the real exam's question count and time limit
   for each of the four tests, so a practice attempt is informative about pacing and not
   just about content.
2. **Drill a weak category.** Pick one content category and work through it untimed,
   with explanations, until it stops being weak.
3. **Learn from wrong answers.** Every question carries an explanation of why the
   correct answer is correct — the study value is in the review, not the score.
4. **See progress over time.** Score history and per-category performance persist
   between sessions so weak areas are identifiable rather than remembered.
5. **Stay maintainable by one non-professional developer.** Readable and editable years
   later, without a toolchain to resurrect.
6. **Grow by adding content, not code.** A fifth test — or a hundred more questions for
   an existing one — is a data change.

## Scope

**In scope, v1:** the four staged Subject Assessments (5101 Business, 5165 Mathematics,
5485 Physical Science, 5652 Computer Science); timed full tests; untimed category
drills; explanations; locally-persisted progress.

**Explicitly out of scope:** user accounts, any server-side component, any public
internet deployment, payment, multi-user features, and the Praxis Core tests unless
added later as data.

## Constraints

- **Original questions only.** ETS's study companions are a structural blueprint; their
  content is off-limits. See `CLAUDE.md`.
- **Static site, no build step, no dependencies** (D-3) — it must open from the
  filesystem and serve as static files from a NAS.
- **Local git only; the NAS is the only deployment target** (D-2).
- **The progress store is real data with no backup** (D-6) — a careless schema change
  destroys a study history that cannot be recovered.

## What "done" looks like for v1

A person opens the site on the home network, picks one of four tests, takes a
full-length timed attempt, reviews every missed question with an explanation, sees which
categories they are weak in, drills one of them, and finds all of that still there next
week.

## Open questions the project owner should settle

These are genuinely unanswered — this draft deliberately does not guess:

1. **Who else uses it?** "Progress saved locally" is per-browser. If two people study on
   the same machine, or one person studies on both a laptop and a tablet, the design
   changes materially. The current design assumes one person, one browser.
2. **How many questions per test is enough for v1?** Enough to fill one full-length
   attempt, or enough that a second attempt isn't the same test again? The second is
   several times the authoring work and should be a deliberate choice.
3. **Is a real deadline driving this?** An actual test date changes the ordering — one
   test's bank finished deep beats four banks finished shallow.
4. **Which of the four matters most?** D-4 sets breadth-first, but if one test is the
   one actually being sat, its bank should be deeper than the rest.
5. **Should wrong answers come back?** Spaced repetition — resurfacing missed questions
   on a schedule — is the single highest-value study feature not currently in scope, and
   it constrains the progress-store schema, so it is much cheaper to decide now than to
   add later.
