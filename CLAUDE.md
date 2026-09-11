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

## The iOS app (`ios/`)

This repository holds the website **and** the native iOS app built from it (**D-44**). The
app is a SwiftUI shell around the same web files, which its Xcode project bundles straight
from the repository root at build time — there is no copy and nothing to sync.
**Read [`ios/CLAUDE.md`](ios/CLAUDE.md) before touching anything under `ios/`.**

- Subjects ship in apps split by track — STEM, Humanities, Administrative, and a parked
  Core (D-41, D-43). The STEM app ships first and must be *approved* before the next is
  submitted. Release work is tracked in [APP-STORE-ROADMAP.md](APP-STORE-ROADMAP.md), not in
  `ROADMAP.md`.
- **A change to a web file is a change to the app.** CI builds the app on every pull
  request, so a broken bundle fails the PR — but a build proves nothing about rendering.
  When a change could look or behave differently inside the app (layout, safe areas,
  navigation, external links), check it in the Simulator.
- **An app-only need is a data-driven mode in the web layer**, never a Swift-side rewrite of
  a page — there is one copy of each file, serving both surfaces.
- ⚠ **The list of published site files is written in three places** — `ios/project.yml`,
  the `deploy-site` job in `.github/workflows/verify.yml`, and the NAS deploy command. A new
  *top-level* site file goes into all three, or it silently goes missing from the app, from
  GitHub Pages, or from the NAS.

Most subjects sit behind a paid unlock (D-42), so a content gap is something a person
bought, not just a rough edge on a free site.

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

The same workflow runs two more jobs. **`ios-build`** builds the iOS app on every pull
request (see `ios/CLAUDE.md`). **`deploy-site`** publishes the site to GitHub Pages after
`verify` passes on `main` — only the site files, never the docs, `tools/` or `ios/`. The NAS
is still deployed by hand.

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
