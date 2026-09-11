# Adding a new subject

End-to-end procedure for adding a Praxis Subject Assessment to this project and to the
native iOS app. Written 2026-09-08, after five subjects (5101, 5165, 5436, 5485, 5652)
had been added and the friction points were known.

Read [SCHEMA.md](SCHEMA.md) for the authoritative data contract — this file is the
procedure, and quotes the contract only where it helps. Where the two disagree,
SCHEMA.md wins and this file is the bug.

**The short version:** a subject is *data*, not code. Adding one that needs no
calculator and no reference panel requires **zero code changes** — a bank file, a
manifest entry, and optionally teaching chapters. Only one file in the whole shipped
codebase (`run.html`) contains any hardcoded subject code at all.

---

## The starting point

This procedure assumes one specific trigger, because it is how every subject has been
added and how the next one will be:

> The session owner drops the new exam's ETS *Study Companion* PDF into
> `Knowledge-Guides/`, points at it, and asks for that subject to be added.

Everything you need for steps 1–3 comes out of that one file. Everything in steps 4–9
is authoring and integration work that follows from it.

**Two settled assumptions**, stated by the session owner 2026-09-08, that this whole
procedure rests on:

- Every new subject is a **standard Praxis Subject Assessment** — same publisher, same
  study-companion format, same "Test at a Glance" / "Content Topics" structure.
- Every question is **single-select multiple choice** (`"type": "single"`, a
  one-element `correct` array).

That is why adding a subject is data work: the runner, scorer, and progress store
already handle exactly this shape, and nothing about a new subject asks them to do
anything they don't already do.

`Knowledge-Guides/` is **gitignored and stays that way** — the PDFs are ETS's
copyrighted publications and must never reach GitHub, on a public repo least of all.
Confirm with `git status` that the new PDF is not showing as untracked before you
commit anything.

---

## 0. Two rules that outrank everything else here

**Original questions only.** The `Knowledge-Guides/` PDFs are ETS's copyrighted study
companions. Take the **blueprint** — test code, time limit, question count, category
names, weightings. Never take the **content** — no verbatim or reworded sample
questions, options, explanations, prose, or figures. The trap is *adaptation*: a
remembered ETS item with the numbers changed still reads as original while being a
derivative work. If a draft feels close to something in a PDF, throw it out and rewrite
from the underlying skill. No tool can check this.

**The answer key is the real correctness surface.** A wrong key teaches a studying
person the wrong fact, and no test, linter, or reviewer will catch it. Verify keys
independently of the drafting pass — a separate pass, ideally a separate session, that
re-solves the question without looking at the recorded answer.

---

## 1. Extract the blueprint

### 1a. Confirm the PDF is readable first

```bash
python3 tools/pdf-text.py "Knowledge-Guides/<new-file>.pdf" --pages 1-4
```

`tools/pdf-text.py` is dependency-free and handles PDF 1.5+ compressed object streams,
which the newer companions use — without that they parse as zero pages.

**It refuses encrypted PDFs with an explicit error rather than returning blank pages.**
`5165-Mathematics.pdf` and `5581-Social Studies.pdf` are both encrypted; the others are
not. Encryption is a detour, not a dead end — the recipe:

1. **Ask the session owner to re-save it.** Open the PDF in Preview →
   **File → Export as PDF…** → save alongside the original. That writes an unencrypted
   copy. This is theirs to run, not yours.
2. **Re-run the extractor on the copy.** It will now parse.
3. **Expect the text to look like `%&'()!*+,-./0+/` at first.** That is not corruption
   — it is a subset font whose codes are arbitrary. The re-save typically drops the
   `/Differences` arrays while keeping the `/ToUnicode` CMaps, and `pdf-text.py` reads
   both, so it decodes ("Study Companion", in that example). If a future file resists
   even this, say so plainly rather than guessing at numbers.

**Never fabricate blueprint numbers or infer them from a sibling subject.** If no
readable copy can be produced, ask the session owner for the figures directly.

### 1b. Read only the structural sections

Find "Test at a Glance" and "Content Topics." Extract:

- test code and official name
- `timeLimitMinutes` and `formLength` (the real exam's question count)
- content categories with their published counts and percentages

⚠ **Stop before the sample-question sections.** Making the PDFs readable makes the
copyright rule easier to break by accident, not harder. Extracted prose must never be
pasted into a bank, a doc, or a question.

### 1c. Check the arithmetic, then confirm before authoring

**Category counts must sum exactly to the stated total.** Every later invariant depends
on this, and `tools/verify.mjs` will reject the bank if it doesn't hold.

Then **report the extracted blueprint back to the session owner and get it confirmed
before authoring a single question.** Roughly 3× `formLength` questions get written
against these numbers — a transcription error found afterwards can invalidate hundreds
of them, and the category `id` values chosen here are permanent.

Record the confirmed facts in [BLUEPRINT.md](BLUEPRINT.md), noting that ETS revises
study companions periodically and these figures should be re-checked against the current
edition before the bank is called complete.

### 1d. Sanity-check the assumptions

The two assumptions above are expected to hold, so this is a glance, not an
investigation. But if a companion does describe something outside them — numeric entry,
multi-select, drag-and-drop, audio or video stimulus, or a reference tool this project
has no renderer for — **stop and raise it at the plan gate.** That would be a code
change rather than a data change, and it is far cheaper to catch here than after a few
hundred questions have been authored against the wrong premise.

---

## 2. What you will create

| Path | Required? | What it is |
|---|---|---|
| `data/tests/<code>.json` | **yes** | The bank: categories, overlays, questions |
| `data/manifest.json` entry | **yes** | One line registering the bank |
| `data/teaching/<code>.json` | recommended | "Study a topic" chapters |
| `data/reference/<name>.json` | optional | Formula sheet / periodic table, if the real exam allows one |

Nothing else. No new HTML page, no new JS module, no route.

---

## 3. Build the bank file

```json
{
  "schemaVersion": 1,
  "code": "5436",
  "name": "General Science",
  "timeLimitMinutes": 150,
  "formLength": 135,
  "referencePanel": "reference/5485-periodic.json",
  "teachingContent": "teaching/5436.json",
  "categories": [ ... ],
  "overlays":   [ ... ],
  "questions":  [ ... ]
}
```

`referencePanel` and `teachingContent` are **optional** — omit them entirely if the
subject has neither. 5101 and 5652 ship with no reference panel and nothing degrades.

### 3a. Category tree

Recursive; any node may have children. Depth varies wildly by subject (5165 has 6
categories, 5101 has 33), which is why the tree is not a fixed two levels.

```json
{
  "id": "I",
  "label": "Number & Quantity and Algebra",
  "weight": { "count": 20, "percent": 30 },
  "children": [
    { "id": "I-A", "label": "Number and Quantity", "weight": { "count": 7,  "percent": 10 } },
    { "id": "I-B", "label": "Algebra",             "weight": { "count": 13, "percent": 20 } }
  ]
}
```

- **Weights are authoritative at the deepest level that publishes them.** If a subject
  publishes weights only at the top level, its subcategories carry `"weight": null` and
  exist purely as study filters.
- A question attaches to the **deepest** category it belongs to.
- **Category `id` values are permanent.** They are the join key for question history in
  a person's saved progress — renaming one silently orphans their study record. Change
  `label` freely; never change `id`.
- The **weight-bearing counts must sum exactly to `formLength`**, and their percents to
  ~100. The verifier enforces both, and this is the most common failure when a blueprint
  was transcribed carelessly.

### 3b. Overlays (only if the exam has a second axis)

Some exams tag questions along a dimension that cuts across content categories — 5165's
*Task of Teaching Mathematics*, 5485's *Science and Engineering Practice*. A question
has one category and zero or more overlays.

```json
"overlays": [
  { "id": "tot", "label": "Task of Teaching Mathematics", "targetShare": 0.25 }
]
```

`targetShare` is a goal for form assembly and a coverage report for authoring, not a
hard constraint — category quotas win when the two conflict. Omit the array entirely if
the exam has no such axis.

---

## 4. Author the questions

### How many

**3× the real exam length**, not 1×. A student should see fresh questions across a first
practice test, topic study, and a second practice test. For a 135-question exam that is
~405 questions. This is the single largest cost of a new subject and dwarfs every
engineering step in this document.

### The question record

```json
{
  "id": "5436-0001",
  "type": "single",
  "categoryId": "I-B",
  "overlays": ["tot"],
  "difficulty": 2,
  "retired": false,
  "stem":    { "format": "text", "value": "..." },
  "options": [
    { "id": "a", "content": { "format": "text", "value": "..." } },
    { "id": "b", "content": { "format": "text", "value": "..." } },
    { "id": "c", "content": { "format": "text", "value": "..." } },
    { "id": "d", "content": { "format": "text", "value": "..." } }
  ],
  "correct": ["b"],
  "explanation": { "format": "text", "value": "..." },
  "authored": "2026-09-08"
}
```

- **`id` is permanent and namespaced by test code.** It keys question history and the
  spaced-repetition schedule. Never reuse or renumber one. Two shapes are in use and
  the verifier accepts either, requiring only the `<code>-` prefix: a topic slug plus a
  counter (`5101-acct-001`), used by four of the six banks, and a flat counter
  (`5165-0001`), used by 5165 alone. **Prefer the topic-slug form for a new subject** —
  it makes a bank browsable by eye and keeps per-category authoring batches independent,
  so two batches cannot collide over the next free number.
- **`correct` is an array even for single-answer questions**, so multi-select can arrive
  later without rewriting every existing question or stored answer.
- **`retired: true` replaces deletion.** A flawed question found after people have
  history against it is retired, never removed — retired questions are excluded from new
  draws but their history entries stay valid.
- **Four options is a convention, not a constraint.** The runner renders what it finds;
  the array needs at least 2.
- `format` is one of `text`, `mathml`, `code`. Use `text` unless the content genuinely
  needs notation or a code block.

### ⚠ Distribute the correct answer

Aim for roughly **25% per option letter**. Check it before calling a bank done:

```bash
python3 - <<'PY'
import json, collections
b = json.load(open("data/tests/<code>.json"))
c = collections.Counter(q["correct"][0] for q in b["questions"] if len(q.get("correct", [])) == 1)
n = sum(c.values())
print({k: f"{v} ({100*v/n:.0f}%)" for k, v in sorted(c.items())})
PY
```

This is not pedantry. 5165's original 198 questions were **92% keyed "a"** with **no
"d" at all** ([issue #93](https://github.com/homesik92/PRAXIS-Practice/issues/93),
fixed 2026-09-10).

**Be precise about why it matters, because this file previously overstated it.** It
claimed a test-taker who noticed could have scored 79% without knowing any mathematics.
That was wrong: `shuffleQuestionOptions` (`js/schema.js`) is called from *every*
form-assembly path, so stored option order is randomised before anything reaches a
screen and no student has ever seen a predictable key. The real exposure is that the
bank file is **100% predictable in raw form** — this repo is public, banks are readable,
and a stored-order view (a print layout, an export, a review render that bypasses
assembly) would turn a latent problem into a live one.

Fixing it afterwards is far more expensive than distributing keys while drafting, and
the cost is not only the reordering. **Rotating a shipped bank's keys silently rewrites
existing study history**: saved answers record option *ids* (`chosen: ["a"]`) and
correctness is recomputed against the current bank, so every attempt already in a
person's browser re-scores, and the spaced-repetition state derived from it skews with
it. #93 was safe to fix only because it happened before the app had users. After
release, this stops being a cheap fix at all.

---

## 5. Optional layers

### Reference panel

Only if the real exam supplies one (a formula sheet, a periodic table). Two shapes exist:
SCHEMA.md §2.9 (`sections`/`entries` prose — 5165's formula sheet) and §2.10 (periodic
table plus constants — 5485's, reused by 5436).

⚠ **Today this is the one part of adding a subject that requires code changes**, and it
has failed both times it was exercised:

1. Add an entry to `REFERENCE_PANEL_KINDS` in `run.html` (which renderer to use).
2. Add an entry to `REFERENCE_PANEL_SHAPES` in `tools/verify.mjs` (which shape to
   validate against).

Miss either and the failure is silent — N-8 records the first miss for 5436, and
[issue #103](https://github.com/homesik92/PRAXIS-Practice/issues/103) is still open for
the second. [Issue #111](https://github.com/homesik92/PRAXIS-Practice/issues/111)
replaces both maps with a `referencePanelKind` field declared on the bank; **once that
lands, delete this warning and this step.**

### Teaching chapters ("Study a topic")

Same `sections`/`entries` shape as the reference panel, plus a `categoryId` on each
section — a chapter is one or more sections sharing a `categoryId` (an overview, worked
examples, common mistakes). A subject with no chapters simply omits `teachingContent`,
but the Start-menu control then dead-ends for that subject, which is a visible gap
rather than a graceful absence. 5436 currently has this gap
([issue #106](https://github.com/homesik92/PRAXIS-Practice/issues/106)).

### Calculator

Currently hardcoded to 5165 alone (`CALCULATOR_TEST_CODE` in `run.html`). A second
quantitative subject needs a code change until
[#111](https://github.com/homesik92/PRAXIS-Practice/issues/111) makes it a data flag.

---

## 6. Register it

```json
{
  "code": "5436",
  "file": "tests/5436.json",
  "enabled": true,
  "name": "General Science",
  "timeLimitMinutes": 150,
  "formLength": 135,
  "bankSize": 622
}
```

All seven fields are **required** — omitting the last four produces four verifier
errors (`name missing`, `timeLimitMinutes must be a number`, and so on).

The display metadata is deliberately duplicated from the bank file so the hub can
render the subject picker from one small fetch instead of pulling every bank just to
read four scalars. `validateManifestAgreement` in `tools/verify.mjs` cross-checks the
copy against the bank on every run, which is what makes the duplication safe — but it
also means **`bankSize` must be updated whenever questions are added**, or the gate
fails. That is the entire integration into the web app: there is **no allow-list of test
codes anywhere** — the hub, runner, scoring, spaced repetition, results, and progress
store all discover subjects from the manifest.

Set `"enabled": false` to author a bank without exposing it publicly yet.

---

## 7. Verify

```bash
node tools/verify.mjs        # manifest + every registered bank
node tools/test-verify.mjs   # the verifier's own unit tests
```

CI runs both on every PR and is the authoritative gate. What it enforces, so you know
what will fail:

- unique category ids, question ids, and option ids
- question ids prefixed `<code>-`
- `correct` non-empty and referencing real option ids
- at least 2 options per question
- every declared overlay actually exists in the bank
- `format` is one of `text` / `mathml` / `code`, and values are non-empty strings
- weight-bearing category counts sum to `formLength`; percents sum to ~100
- referenced `referencePanel` / `teachingContent` files exist and parse

What it does **not** check: answer correctness, answer distribution, prose quality, or
originality. Those are yours.

---

## 8. Special case — deriving from a sibling subject

Where two exams genuinely overlap (5436 General Science reuses much of 5485 Physical
Science), questions can be generated with `derivedFrom` rather than re-authored — see
SCHEMA.md §2.12 and `tools/derive-5436.mjs`.

Two landmines from doing this once:

- **`.authoring/*.json` is the merge script's source of truth** (N-7). A fix made
  directly in the bank but not mirrored back is silently reverted by the next merge run.
- **A blueprint topic-heading diff is not a content audit** (N-9). Before authoring
  against a "missing topic," check the actual derived question set — one named gap
  turned out to be already covered under a different heading.

---

## 9. Integrating into the iOS app

The iOS app lives in this repository at `ios/` and bundles the root web files at build time
(**D-44**). There is nothing to copy and nothing to sync.

1. **The files need nothing.** A bank, teaching or reference file added under `data/` is in
   the next app build automatically, and so is its manifest entry — the app ships
   `manifest.json` exactly as the site does. CI's `ios-build` job builds the app on the same
   pull request that adds the subject.
2. **Assign the subject to an app.** Subjects ship in apps split by track — STEM,
   Humanities, Administrative, Core (D-41, D-43). The manifest's `track` field is what will
   assign it; it is specified in #121 but **not implemented yet**. Until it is, state the
   intended track in the PR description and add the subject to APP-STORE-ROADMAP.md's
   per-app table.
3. **No purchase product per subject.** Under D-42 each app has **one** non-consumable
   unlock covering every subject in it, so a new subject needs nothing in App Store Connect.
   What the free tier includes *within* a subject is still open in #131.
4. **Reachability in the app.** Today the app opens 5165 directly; until the native subject
   picker is built, a new subject is bundled but not reachable inside the app. Once it is,
   check the subject in the Simulator per `ios/CLAUDE.md`'s "Build and verify".

**The line that must not be crossed:** web files serve both the site and the app. A
presentation difference the app seems to need belongs in the web layer as a data-driven
mode the site understands too — never as a Swift-side rewrite of a page.

⚠ A subject that adds only files *inside* `data/` changes no publish list. One that adds a
new **top-level** site file must add it to all three: `ios/project.yml`, the `deploy-site`
job in `.github/workflows/verify.yml`, and the NAS deploy command.

---

## 10. Checklist

- [ ] PDF parses (not encrypted); confirmed it is **not** showing as untracked in git
- [ ] Blueprint facts extracted, arithmetic checked, and **confirmed with the session
      owner before authoring**
- [ ] Glanced at the companion to confirm it's standard single-select (expected; raise
      it at the plan gate if not)
- [ ] Blueprint facts recorded in `BLUEPRINT.md`; category counts sum to the exam total
- [ ] Bank file created; category ids final (they are permanent)
- [ ] Questions authored to ~3× exam length, all original
- [ ] **Answer key verified independently of the drafting pass**
- [ ] **Answer distribution checked (~25% per letter)**
- [ ] Teaching chapters authored, or the gap consciously accepted and filed
- [ ] Reference panel added — plus both map entries, until #111 lands
- [ ] Manifest entry added
- [ ] `node tools/verify.mjs` and `node tools/test-verify.mjs` clean
- [ ] Live-tested in a browser: a full attempt, a topic drill, the teaching page
- [ ] Decision-log entry if anything non-obvious was decided; ROADMAP updated
- [ ] Intended app track stated (the `track` field once #121 lands) and added to
      APP-STORE-ROADMAP.md's per-app table
- [ ] CI's `ios-build` job green; any new top-level site file added to all three publish lists
