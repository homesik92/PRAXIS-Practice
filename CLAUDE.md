# Project instructions — PRAXIS-Practice

Read [ROADMAP.md](ROADMAP.md) first to see what phase the project is in, then
[DECISIONS-INDEX.md](DECISIONS-INDEX.md) to find the decisions that govern the surface
you are about to touch — jump from it into those entries rather than reading
[DECISIONS.md](DECISIONS.md) whole. `REQUIREMENTS.md` and `DESIGN.md` don't exist yet —
they're produced during the design stage (see below).

The development methodology is vendored at `.claude/skills/dev-workflow/` — invoke it
before any session that changes code or docs. It started as a copy of `splankna-ios`'s
own vendored methodology (itself from `homesik92/splankna-rebuild`, itself from
`fthiess/checkers-demo`) and has been adapted for this project; it no longer tracks that
or any other upstream.

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

The PDFs are gitignored and stay that way. The full rule is in
`.claude/skills/dev-workflow/SKILL.md`.

## No CI, no PRs, no issue tracker

This repository is **local git only** — no GitHub remote (see D-2). Three consequences,
each with its substitute:

- **No pull requests.** Work still happens on a feature branch and lands via
  `git merge --no-ff`, so a session's work stays revertible as a unit.
- **No CI.** The local verification command is therefore the *only* gate, not a preview
  of a stronger one — which raises the bar on actually running it, not lowers it.
- **No issue tracker.** Deferred work goes in [BACKLOG.md](BACKLOG.md) as a numbered
  `B-n` entry, filed when discovered.

If a remote is ever added, the full-strength clauses in the methodology activate as
written and these substitutes retire.

## Verification

The coding plan (ROADMAP.md, Phase 0.1) specifies `tools/verify.mjs`, a dependency-free
Node script that validates every question-bank file against SCHEMA.md's shape and
invariants. It does not exist yet — Phase 0 has not started. Once it lands, run it as:

```
node tools/verify.mjs
```

This is the *only* gate (see "No CI, no PRs, no issue tracker" above) — never skip it
before merging, and never add a step here that requires `npm install`.

## Answer keys are the real correctness surface

Most projects' bugs are in code. This one's most damaging bugs are **wrong answer keys
and misleading explanations**, which no test suite, linter, or code review will catch,
and which teach a studying person the wrong fact. Question-authoring sessions run at
high effort, and the answer key gets verified independently of the drafting pass.

## Conventions

- Documentation is code. Decision-log entries, ROADMAP status, and doc updates land in
  the same change as the code they describe.
- Deferred work becomes a `BACKLOG.md` entry when discovered, never a TODO comment.
- Accessibility is built in as each surface is written, not retrofitted. A test-taking
  interface is keyboard-driven by nature — timers, radio groups, and progress
  announcements all need to work for screen readers and without a mouse.

## Coding norms

Settled so far (see D-3): plain HTML, CSS, and JavaScript with no build step and no
runtime dependencies; question banks as separate data files. Everything else — file
layout, module pattern, test runner — is for the design stage to settle.

## Environment notes

Developed on macOS (Ventura 13.2.1), zsh, Apple Silicon. Node 22 and Python 3.14 are
available on the machine for tooling, but the *site itself* has no runtime dependency on
either — it must keep working when opened directly from the filesystem or served as
static files from a NAS.
