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

Read the subject's ETS study companion for structural facts only:

```bash
python3 tools/pdf-text.py "Knowledge-Guides/5436-General Science.pdf" --pages 3-18
```

⚠ Stop before the sample-question sections. Making the PDFs readable makes the
copyright rule easier to break by accident, not harder.

Record in [BLUEPRINT.md](BLUEPRINT.md): test code, official name, `timeLimitMinutes`,
`formLength` (real exam question count), and the content categories with their published
counts and percentages. **Check that the category counts sum exactly to the stated
total** before going further — every later invariant depends on it.

Note: `5165-Mathematics.pdf` is encrypted and `pdf-text.py` refuses it by design.

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

- **`id` is permanent and namespaced by test code** (`<code>-NNNN`). It keys question
  history and the spaced-repetition schedule. Never reuse or renumber one.
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

This is not pedantry. 5165's original 198 questions were **79% keyed "a"** with 4% "d"
— a test-taker who noticed could score 79% without knowing any mathematics, on the app
whose whole job is to demonstrate that the content is good. See
[issue #93](https://github.com/homesik92/PRAXIS-Practice/issues/93). Fixing it after the
fact is far more expensive than distributing keys while drafting, because each change
means reordering options *and* re-reading the explanation to confirm it still refers to
the right choice.

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
{ "code": "5436", "file": "tests/5436.json", "enabled": true }
```

That is the entire integration into the web app. Display name, timings, and counts live
in the bank file so there is one authority, not two that can disagree. There is **no
allow-list of test codes anywhere** — the hub, runner, scoring, spaced repetition,
results, and progress store all discover subjects from the manifest.

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

Since [PRAXIS-iOS-Math D-19](https://github.com/homesik92/PRAXIS-iOS-Math/blob/main/DECISIONS.md),
**one** app holds every subject — Mathematics free, others unlocked by in-app purchase.
There is no per-subject app, target, repo, or icon.

1. **Sync the data.** Copy the new bank (and teaching/reference files) plus any changed
   engine files into `Sources/WebContent/`. The app bundles this repo's `manifest.json`
   **verbatim** — no trimming, no app-side edits.
   Automation is tracked as
   [PRAXIS-iOS-Math#21](https://github.com/homesik92/PRAXIS-iOS-Math/issues/21).
2. **The subject picker.** It renders from the manifest, so a newly registered subject
   appears without a code change.
3. **If the subject is paid:** register a non-consumable in-app purchase product for it
   in App Store Connect and add its product id to the entitlement map. Free subjects
   need nothing.
4. **Rebuild and verify on a simulator**, then a real device.

**The line that must not be crossed:** the iOS repo chooses *which* files it bundles and
what native chrome wraps them — it never edits the contents of a file this repo owns. A
presentation difference that seems to need a web-file change belongs **here**, as a
data-driven mode, not as a downstream edit that forks a shared file forever.

⚠ Any PR here touching `test.html`, `results.html`, `run.html`, `teach.html`,
`index.html`, `css/base.css`, or `js/*` must say so in its description (D-30) — nothing
propagates downstream automatically, and it has silently drifted for real more than once.

---

## 10. Checklist

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
- [ ] PR description flags downstream sync if shared engine files changed
- [ ] iOS app: data synced, rebuilt, verified; IAP product registered if paid
