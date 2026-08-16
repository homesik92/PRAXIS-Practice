# PRAXIS-Practice

A website for taking practice Praxis® tests — timed full-length exams, untimed drills
by content category, answer explanations, and study progress saved in the browser.

Four Praxis Subject Assessments are in scope for the first version:

| Code | Test |
| --- | --- |
| 5101 | Business Education: Content Knowledge |
| 5165 | Mathematics: Content Knowledge |
| 5485 | Physical Science: Content Knowledge |
| 5652 | Computer Science |

The question-bank format is designed so a fifth test can be added later without
touching the site's code.

## Status

**Design stage.** No application code yet. See [ROADMAP.md](ROADMAP.md) for the current
phase, and `.claude/skills/dev-workflow/design-methodology.md` for the process this
project follows to get from idea to a coding plan.

## Every question here is original

This project is **not affiliated with or endorsed by ETS**, and Praxis® is ETS's
registered trademark. No ETS exam content appears in this repository or on the site.

The `Knowledge-Guides/` folder holds ETS's published *Study Companion* PDFs for the four
tests. They are used as a **blueprint only** — for each test's content categories,
their approximate weightings, the question count, and the time limit, which are facts
about a test's structure. Every practice question is written from scratch to exercise a
listed category. The PDFs themselves are third-party copyrighted material and are
gitignored; they are not part of this repository.

The full rule, including what "written from scratch" excludes, is in
`.claude/skills/dev-workflow/SKILL.md` under "The ETS copyright rule."

## Where it runs

Local git only — there is no GitHub remote, no CI, and no issue tracker (deferred work
goes in [BACKLOG.md](BACKLOG.md)). The finished production build is served from a NAS on
the home network; nothing is published to the public internet.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md).
