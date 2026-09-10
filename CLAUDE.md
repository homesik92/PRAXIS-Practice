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

## Adding a new subject

[ADDING-A-SUBJECT.md](ADDING-A-SUBJECT.md) is the end-to-end procedure — blueprint
extraction, bank structure, category tree, authoring standards (including the answer-key
distribution check), the optional reference-panel and teaching layers, the manifest
entry, the verification gate, and the downstream iOS integration. Read it before adding
a subject rather than reverse-engineering the shape from an existing bank.

The headline: **a subject is data, not code.** One that needs no calculator and no
reference panel requires zero code changes.

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

## Downstream native apps

This repo is the multi-subject master — it's the source of truth for every Praxis
exam's content and shared engine code. Subjects ship inside native iOS apps built from
one downstream repo (`PRAXIS-iOS-Math` today, to be renamed `PRAXIS-iOS`) — see
D-30 → D-37 → D-38 → **D-41**, which splits the wrapper into **three** apps by subject
area (STEM, Humanities, Administrative) rather than one holding everything. The STEM app
ships and must be *approved* before the second is submitted. Release work itself is
tracked in [APP-STORE-ROADMAP.md](APP-STORE-ROADMAP.md), not in `ROADMAP.md`. That app bundles a manual copy of every file this repo
owns: `test.html`, `results.html`, `run.html`, `teach.html`, `index.html`,
`css/base.css`, `js/*`, and the whole `data/` payload including `manifest.json`
unmodified. Nothing propagates a change here to that repo automatically.

Most subjects are **paid**, so a content gap there is something a person bought, not
just a rough edge on a free site.

Worth knowing when a change here looks like it needs a downstream tweak: the
downstream repo's own rule is that it never edits the contents of a file this repo
owns. So if a wrapper app needs a *presentation* difference — single-subject
layout, say — the change belongs **here**, as a data-driven mode, not as a local
edit that forks the file forever. **Flag it in the PR description** whenever a PR
touches any of those files, so a downstream sync isn't missed — this has already
happened for real once (issue #66's fix sat unsynced in PRAXIS-iOS-Math for a full
session before being noticed).

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

These run in CI on every pull request and every push to `main`
(`.github/workflows/verify.yml`), which is the **authoritative** gate. Running them
locally first is still the right habit — it catches most mistakes in seconds rather
than a CI cycle — but the PR run is what decides. The workflow installs nothing:
this project has no `package.json` and no build step (D-3), so the gate is just Node
running these same commands, plus `tools/pdf-text.py`'s own self-test (python3 is
preinstalled on the runner, so nothing is installed there either).

## Reading the study companions

`tools/pdf-text.py` extracts text from a PDF with no third-party dependencies — this
machine has no `pdftotext`/`pdftoppm`/`mutool`/`qpdf` and no Python PDF library, and
this project deliberately has no dependencies to add one to (D-3).

```
python3 tools/pdf-text.py Knowledge-Guides/5436-General\ Science.pdf --pages 3-18
python3 tools/pdf-text.py --self-test
```

It handles PDF 1.5+ compressed object streams, which the newer companions use — without
that they parse as zero pages, and both `/Differences` encodings and `/ToUnicode` CMaps,
without which subset-embedded fonts come out as a substitution cipher. It **refuses
encrypted PDFs with an error** rather than returning blank pages; `5165-Mathematics.pdf`
and `5581-Social Studies.pdf` are encrypted, the other four are not. The way past that is
a Preview **File → Export as PDF…** re-save by the session owner — see
[ADDING-A-SUBJECT.md](ADDING-A-SUBJECT.md) §1a for the full recipe.

⚠ **Blueprint only.** Use it to read "Test at a Glance" and "Content Topics," and stop
before the sample-question sections. Making the PDFs readable makes the copyright rule
above easier to break by accident, not harder — extracted prose must never be pasted
into a bank, a doc, or a question.

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
