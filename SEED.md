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

## Stated interaction requirements

Given directly by the project owner; logged as D-9.

1. The **index page** offers a choice of the four tests.
2. With a test chosen, the next page offers **take a sample test** or **study a
   particular topic** within that test.
3. Choosing *test* leads to a page with a **Start** button. Start begins the timer and
   presents question 1 with multiple-choice answer buttons. Choosing an answer presents
   the next question. **Remaining time is shown at the top.**
4. On completion, a **dashboard by topic** shows the percentage of questions correct and
   incorrect.

Answer options are **four choices, exactly one correct**.

## Open questions the project owner should settle

Three of the original five are now answered (see D-7, D-8, N-3). Still open:

1. **Who else uses it?** "Progress saved locally" is per-browser. If two people study on
   the same machine, or one person studies on both a laptop and a tablet, the design
   changes materially. The current design assumes one person, one browser — and D-8's
   spaced repetition makes that assumption load-bearing, since a review schedule split
   across two devices is two different schedules.
2. **Is a real deadline driving this?** An actual test date changes the ordering of the
   411-question authoring effort, and would also make spaced repetition's interval
   scheduling need to compress toward the date rather than run open-endedly.
3. **Does the question format follow ETS or stay uniform?** See BLUEPRINT.md, "Open
   format question" — D-9 sets four-option single-select, which matches only 5485 of the
   four tests.
4. **Are the provided reference materials in scope?** 5165's graphing calculator and
   formula sheet, 5485's periodic table and constants table (finding F-3).
