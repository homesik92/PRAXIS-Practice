# Requirements & Data Schema

Design session 2. This is the load-bearing document: it fixes the shape of the question
banks and of the saved-progress store, and those are the two things that are expensive
to change later — banks because there will eventually be 411 files' worth of content
conforming to them, and the progress store because it holds real study history with no
backup.

Governing decisions: D-3 (no build step), D-4 (extensible), D-6 (local progress),
D-8 (spaced repetition), D-9/D-11 (screen flow), D-10 (question format), D-12
(reference panels). Blueprint facts and findings: [BLUEPRINT.md](BLUEPRINT.md).

---

# Part 1 — Requirements

## 1.1 Screens

**S1 · Index.** Lists the four tests from the manifest — code, name, time limit,
question count, and how many questions the bank currently holds. Choosing one goes to
S2. The list is generated from data, never hardcoded (D-4).

**S2 · Test menu.** Two paths: *Take a practice test* (S3) or *Study a topic* (S5).
Shows this test's recent attempt history and, when any questions are due for review
(D-8), a "N questions due" entry point.

**S3 · Test runner.** A Start button begins the timer and presents question 1. Selecting
an answer records it and advances immediately. Remaining time is displayed at the top
throughout. After the last question, the run enters the **review pass** (D-11): a list of
every question with its flag/answered state, any of which can be reopened and changed.
The timer continues running during review. Submitting — or the timer expiring — scores
the attempt and goes to S4.

**S4 · Results dashboard.** Percentage correct and incorrect **by content category**
(D-9), plus the overall score, time used, and a full review list of every question with
the chosen answer, the correct answer, and the explanation.

**S5 · Topic study.** Pick a category from this test's tree and drill it untimed, with
the explanation shown immediately after each answer rather than at the end. No score is
recorded against a test form; results feed question history only.

## 1.2 Behavior that is easy to get wrong

- **A practice form is weight-correct, not random** (F-2). A 5485 form is 18/25/41/41
  across its four categories, not 125 arbitrary questions. See §2.6.
- **An underfilled bank is disclosed, never silently padded.** If a category cannot
  supply its quota, the form is still assembled but the results screen states which
  categories were short and by how much. A practice score built from a
  non-representative draw, presented as if representative, is actively misleading — this
  is the single most damaging thing this site could do to someone studying.
- **The timer is wall-clock, not tick-counted.** Store the attempt's start timestamp and
  derive remaining time from `Date.now()`. A counter decremented on an interval drifts,
  and stops entirely if the tab is backgrounded — which would silently hand back time.
- **An interrupted attempt is resumable.** A closed tab mid-test must not destroy the
  attempt or the history it would have produced.

## 1.3 Accessibility

Built in as each surface is written (per `CLAUDE.md`), not retrofitted:

- Answer options are a real radio group — arrow keys move between options, Space/Enter
  selects. Not clickable `<div>`s.
- The whole run is completable by keyboard alone.
- The countdown is `aria-live="polite"` and announces at meaningful thresholds (10 min,
  5 min, 1 min) rather than on every tick, which would make a screen reader unusable.
- Advancing on selection moves focus to the new question's stem and announces the
  position ("Question 12 of 66").
- Correct/incorrect is never signalled by color alone.
- Reference panels (D-12) are reachable and dismissible by keyboard, and do not trap
  focus.

## 1.4 Non-goals for v1

No accounts, no server, no network calls, no sync between devices or browsers, no
constructed-response or essay items, no analytics, no public deployment.

---

# Part 2 — Data schema

## 2.1 Layout

```
data/
  manifest.json          registry of tests — the only file the site scans
  tests/
    5101.json            bank: metadata + category tree + questions
    5165.json
    5485.json
    5652.json
  reference/
    5165-formulas.json   reference panel content (D-12)
    5485-periodic.json
```

**Adding a fifth test is: drop in `tests/5299.json`, add one line to `manifest.json`.**
No code changes (D-4, closes B-1). This holds only if the site never hardcodes a test
code — enforced by keeping the four known codes out of the source entirely.

## 2.2 `manifest.json`

```json
{
  "schemaVersion": 1,
  "tests": [
    { "code": "5165", "file": "tests/5165.json", "enabled": true }
  ]
}
```

Deliberately minimal — display names and timings live in the bank file so there is one
authority for them, not two that can disagree.

## 2.3 Bank file

```json
{
  "schemaVersion": 1,
  "code": "5165",
  "name": "Mathematics",
  "timeLimitMinutes": 180,
  "formLength": 66,
  "referencePanel": "reference/5165-formulas.json",
  "categories": [ /* §2.4 */ ],
  "overlays":   [ /* §2.5 */ ],
  "questions":  [ /* §2.6 */ ]
}
```

`formLength` and `timeLimitMinutes` come from BLUEPRINT.md and are what make a practice
attempt time-realistic. `referencePanel` is omitted for 5101 and 5652.

## 2.4 Category tree — variable depth

Finding F-6: 5101 has 33 subcategories, 5165 has 6 (and publishes weights for only
4 of them), 5485 has 9, 5652 has 10. A fixed two-level scheme cannot hold all four, so
the tree is recursive and any node may have children.

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

Rules:

- **Weights are authoritative at the deepest level that publishes them.** 5165 publishes
  I-A and I-B, so the draw uses those. 5485 publishes only the top level, so its
  subcategories carry `"weight": null` and exist purely as study filters.
- A question attaches to the **deepest** category it belongs to.
- Category `id` values are **permanent**. They are the join key from question history in
  the progress store, so renaming one silently orphans a study record. Change `label`
  freely; never change `id`.

## 2.5 Overlays — the second axis

Finding F-4: 5165 tags ~25% of questions as a *Task of Teaching Mathematics*; 5485 has
*Science and Engineering Practice* on ≥50% and *Task of Teaching Science* on ~25–33%.
These cut across content categories — a question has one category and zero or more
overlays — so modelling category as the only axis would make them unrepresentable.

```json
"overlays": [
  { "id": "tot", "label": "Task of Teaching Mathematics", "targetShare": 0.25 }
]
```

`targetShare` is a goal for form assembly and a coverage report for authoring, not a
hard constraint — content category quotas win when the two conflict.

## 2.6 Question record

```json
{
  "id": "5165-0001",
  "type": "single",
  "categoryId": "I-B",
  "overlays": ["tot"],
  "difficulty": 2,
  "stem":        { "format": "text", "value": "..." },
  "options": [
    { "id": "a", "content": { "format": "text", "value": "..." } },
    { "id": "b", "content": { "format": "text", "value": "..." } },
    { "id": "c", "content": { "format": "text", "value": "..." } },
    { "id": "d", "content": { "format": "text", "value": "..." } }
  ],
  "correct": ["b"],
  "explanation": { "format": "text", "value": "..." },
  "authored": "2026-08-16"
}
```

Three choices here carry their weight and should not be simplified away:

- **`type` and `correct`-as-array (D-10).** v1 authors only `"single"` with a
  one-element array. When multi-select or numeric entry arrives, no existing question
  and no stored answer needs rewriting. Storing a bare string here would guarantee a
  migration later.
- **`id` is permanent and namespaced by test code.** It is the key for question history
  and the spaced-repetition schedule. Reusing or renumbering an id corrupts a real study
  record.
- **Four options is a convention, not a schema constraint.** The array is variable
  length; the runner renders what it finds. This keeps the door open without any
  restructuring.

### Content formatting (closes B-2)

`format` discriminates how a value is rendered, so the three tests' different notation
needs do not each become a special case in the runner:

| `format` | Rendered as | Used by |
| --- | --- | --- |
| `text` | Escaped plain text | all tests, the large majority of questions |
| `mathml` | Inline MathML, inserted as markup | 5165, 5485 |
| `code` | `<pre><code>`, whitespace preserved, never highlighted | 5652 |

**MathML is the recommended call, and it is a judgement, not a settled fact.** It renders
natively in current Safari, Chrome, and Firefox with no library, which is what D-3's
no-dependencies rule requires; a LaTeX renderer would be either a dependency or ~200
lines of fragile in-project code. The cost is real: MathML is verbose and unpleasant to
hand-author. Two mitigations — most questions need no math markup at all, and an
authoring helper script can live in the repo without becoming a runtime dependency,
since it runs at authoring time and its output is committed.
*Flag for session 3's review: this is the least-verified choice in this document, and
browser MathML support should be confirmed against current docs before the first Math
question is authored.*

5652's `code` blocks use **ETS's published pseudocode notation, not a real language**
(finding F-5). Rendering never syntax-highlights, because highlighting implies a
language the exam does not assume.

## 2.7 Form assembly

Given a bank and a `formLength`:

1. Collect every **weight-bearing** category (deepest node with a non-null `weight`).
2. Target per category = its published `count`, scaled if `formLength` is overridden for
   a shorter practice run.
3. Draw without replacement, preferring questions the person has seen least recently —
   so a second attempt is not the first attempt again.
4. If a category cannot fill its quota, take what exists and **record the shortfall on
   the attempt**. Never backfill from another category: a form that quietly over-samples
   Chemistry to cover a thin Physics bank produces a score that means nothing.
5. Try to meet each overlay's `targetShare` within the already-chosen set; report but do
   not enforce.
6. Shuffle presentation order, and shuffle option order per question — the position of
   the correct answer must not be learnable.

## 2.8 Progress store

One localStorage key, `praxis-practice`, holding one object.

```json
{
  "storeVersion": 1,
  "attempts": [
    {
      "id": "att-2026-08-16-001",
      "testCode": "5165",
      "mode": "test",
      "startedAt": "2026-08-16T14:02:11.000Z",
      "finishedAt": "2026-08-16T16:44:03.000Z",
      "timeLimitMinutes": 180,
      "formLength": 66,
      "shortfalls": [{ "categoryId": "II-B", "wanted": 7, "got": 3 }],
      "answers": [
        { "questionId": "5165-0001", "chosen": ["b"], "correct": true, "elapsedMs": 48200, "flagged": false }
      ]
    }
  ],
  "questionHistory": {
    "5165-0001": {
      "seen": 3, "correct": 2,
      "lastSeenAt": "2026-08-16T14:03:00.000Z",
      "dueAt": "2026-08-20T00:00:00.000Z",
      "intervalDays": 4, "ease": 2.5
    }
  }
}
```

`shortfalls` is stored on the attempt, not recomputed — the bank grows over time, so a
score's representativeness can only be judged against the bank as it was that day.

### Spaced repetition (D-8)

An SM-2-style schedule, deliberately the simple version: correct answer →
`intervalDays = max(1, round(intervalDays × ease))` and a small ease increase; incorrect
→ `intervalDays = 1` and an ease decrease, floored at 1.3. `dueAt = now + intervalDays`.
Questions never seen have no history entry and are drawn as new.

### Versioning — the one migration that can lose real data

This store is the only live data in the project and it has **no backup** (D-6). The
launch methodology's expand/contract discipline applies here in full:

- `storeVersion` is checked on every load.
- **Before any migration runs, the pre-migration value is copied to
  `praxis-practice.backup.v{n}` and left there.** This is the entire safety net; it must
  land in Phase 0, not when the first migration is needed.
- Migrations are additive first: add the new field, write both, backfill, switch reads,
  and only remove the old field in a later change.
- A store from a *newer* version than the code understands is never migrated downward —
  the site reports it and reads nothing, rather than destroying a history written by a
  later version.

---

## Open items carried forward

- **MathML support** — verify against current browser docs before authoring Math
  questions (§2.6).
- **Multi-device use** remains an open question in [SEED.md](SEED.md). D-8 makes it
  sharper: a review schedule split across a laptop and a tablet is two schedules that
  each think they are complete.
- **Reference panel content** (D-12) is authored content and needs its own schema pass
  before 5165/5485 authoring begins; `reference/*.json` is a placeholder shape here.
