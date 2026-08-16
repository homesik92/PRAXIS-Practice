# Project instructions — PRAXIS-Practice

Read [ROADMAP.md](ROADMAP.md) first to see what phase the project is in, then
[DECISIONS-INDEX.md](DECISIONS-INDEX.md) to find the decisions that govern the surface
you are about to touch — jump from it into those entries rather than reading
[DECISIONS.md](DECISIONS.md) whole.

The development methodology is vendored at `.claude/skills/dev-workflow/` — invoke it
before any session that changes code or docs. It started as a copy of `splankna-ios`'s
own vendored methodology (itself from `homesik92/splankna-rebuild`, itself from
`fthiess/checkers-demo`) and has been adapted for this project; it no longer tracks that
or any other upstream.

## This repository is public

Same treatment as `splankna-ios` and `splankna-rebuild` (D-16): local development
directory plus a public GitHub repo under `homesik92`, work landing through the normal
branch → PR → merge loop. The session owner's NAS is the **production deployment
target for the final version only** — it is not where day-to-day work happens, and it
is not a substitute for the GitHub remote.

## The one rule that no tool can enforce: original questions only

The `Knowledge-Guides/` PDFs are ETS's copyrighted study companions. Take the
**blueprint** from them — content category names, weightings, question counts, time
limits, the general shape of an item. Never take the **content** — no verbatim or
reworded sample questions, no answer choices, no explanations, no reproduced prose, no
screenshotted figures. Write every question from scratch against the underlying skill.

The trap is *adaptation*: a remembered ETS item with the numbers changed still reads as
original while being a derivative work. If a drafted question feels close to something
in the PDFs, throw it out and write a new one from the skill rather than editing the
surface of the old one.

The PDFs are gitignored and stay that way — this matters more, not less, on a public
repo. The full rule is in `.claude/skills/dev-workflow/SKILL.md`.

## Verification

`tools/verify.mjs` is a dependency-free Node script that validates the manifest and
every question-bank file it registers against SCHEMA.md's shape and invariants (unique
ids, option/correct consistency, weight-bearing category counts summing to
`formLength`, known `format` values, and more). Run it as:

```
node tools/verify.mjs
```

Its own logic is unit-tested against fixture banks (one valid, one deliberately broken)
in `tools/test-verify.mjs`:

```
node tools/test-verify.mjs
```

Until CI is wired up, this is the *only* gate, so run both before every push. Once CI
exists it becomes the fast local check that precedes the authoritative PR run — never a
step that requires `npm install`.

## Answer keys are the real correctness surface

Most projects' bugs are in code. This one's most damaging bugs are **wrong answer keys
and misleading explanations**, which no test suite, linter, or code review will catch,
and which teach a studying person the wrong fact. Question-authoring sessions run at
high effort, and the answer key gets verified independently of the drafting pass.

## Conventions

- Documentation is code. Decision-log entries, ROADMAP status, and doc updates land in
  the same PR as the code they describe.
- Deferred work becomes a GitHub issue when it is discovered, never a TODO comment.
- Accessibility is built in as each surface is written, not retrofitted. A test-taking
  interface is keyboard-driven by nature — timers, radio groups, and progress
  announcements all need to work for screen readers and without a mouse.

## Coding norms

Settled so far (see D-3): plain HTML, CSS, and JavaScript with no build step and no
runtime dependencies; question banks as separate data files. Everything else — file
layout, module pattern, test runner — is settled in `ROADMAP.md`'s coding plan.

## Environment notes

Developed on macOS (Ventura 13.2.1), zsh, Apple Silicon. Node 22 and Python 3.14 are
available on the machine for tooling (the verification gate, PDF-extraction helper
scripts), but the *site itself* has no runtime dependency on either.
