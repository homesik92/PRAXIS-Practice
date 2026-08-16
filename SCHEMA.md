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
(D-8), a "N questions due" entry point. **When an `in-progress` attempt exists for this
test (§2.8), S2 leads with a "Resume attempt" entry** rather than only offering to start
a fresh one — review finding #10/#1.

**S3 · Test runner.** A Start button begins the timer and presents question 1.

Each question presents its four answer options plus a **flag-for-review toggle**,
reachable and operable by keyboard, distinct from selecting an answer (finding #13).
Selecting an answer records it and advances immediately; the timer keeps running.
Remaining time and the current position ("Question N of M") are shown at the top
throughout, in a **persistently focusable element** a screen-reader user can navigate to
and query on demand — not only via the passive threshold announcements in §1.3 (finding
#12).

Before the timer starts, the Start screen states plainly that answered questions cannot
be revisited except through the end-of-run review pass (finding #18) — and that this
forward-only model is a deliberate simplification of this project's own design, not a
verified match to ETS's current on-screen navigation (finding #19; see D-11).

After the last question, the run enters the **review pass** (D-11): a list of every
question, each row showing its flag/answered state alongside a short stem excerpt and
category label — not a bare number (finding #16) — any of which can be reopened and
changed. The timer continues running during review.

**Submitting requires confirmation** stating the count of unanswered and flagged
questions before scoring (finding #11). **If the wall-clock deadline passes while the
tab was closed or backgrounded,** resuming shows an explicit "time expired while you
were away" screen before scoring, rather than silently force-submitting on load (finding
#10). Confirming, or the timer expiring while the tab is open, scores the attempt and
goes to S4.

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
- **An interrupted attempt is resumable — with a data model that actually makes this
  true.** A closed tab mid-test must not destroy the attempt or the history it would have
  produced. Session 3's review found this stated as a requirement with nothing in the
  schema to satisfy it; §2.8 now defines `status`, write cadence, and the résumé lookup
  that make it real (findings #1, #5, #10).
- **Two tabs of the site open at once must not silently clobber each other's writes.**
  localStorage has no cross-tab locking; a naive full-object read-modify-write lets tab A
  silently discard tab B's completed attempt. §2.8 requires listening for the `storage`
  event and reconciling rather than blindly overwriting (finding #2).
- **A flawed question gets retired, never deleted**, once any history exists for it —
  physical removal would orphan `questionHistory` entries and corrupt the "N due" count
  on S2 (finding #7; §2.6).
- **Storage failures are visible, never silent.** A quota-exceeded write or a corrupted
  read must surface to the person, not discard their just-finished attempt or quietly
  reinitialize an empty store (finding #6; §2.8).

## 1.3 Accessibility

Built in as each surface is written (per `CLAUDE.md`), not retrofitted:

- Answer options are a real radio group — arrow keys move between options, Space/Enter
  selects. Not clickable `<div>`s.
- The whole run is completable by keyboard alone.
- The countdown is `aria-live="polite"` and announces at meaningful thresholds (10 min,
  5 min, 1 min) rather than on every tick, which would make a screen reader unusable —
  **and the timer/position element itself is reachable on demand** (not just passively
  announced), closing the parity gap a sighted user doesn't have: they can glance at the
  clock any time; the original design gave a screen-reader user only three announcements
  over a three-hour test (finding #12).
- Advancing on selection moves focus to the new question's stem and announces the
  position ("Question 12 of 66"). **This announcement and a threshold countdown
  announcement are queued, never allowed to fire simultaneously** — an unqueued
  collision would garble or interrupt whichever the person needed to hear (finding #15).
- Correct/incorrect is never signalled by color alone.
- Reference panels (D-12) are reachable and dismissible by keyboard, do not trap focus,
  are **non-modal and never obscure the question stem** — the whole point of providing
  one is to consult it while working the problem — and **return focus to the control
  that opened them on dismiss** (finding #17).
- **A "download my progress" export is available from S2**, giving the person an
  out-of-band recovery path independent of the browser's storage — the cheapest single
  mitigation against the cross-tab, storage-failure, and manual-data-clearing risks above
  (finding #9).

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
  "retired": false,
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
- **`retired` replaces deletion.** A flawed question found after history exists against
  it is set `retired: true`, never removed from the file. Retired questions are excluded
  from new draws (§2.7) but their `questionHistory` entries stay valid, so a physical
  removal never orphans a real study record or corrupts the "N due" count on S2
  (review finding #7).
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

1. Collect every **weight-bearing** category (deepest node with a non-null `weight`),
   excluding `retired` questions from the pool.
2. Target per category = its published `count`, scaled if `formLength` is overridden for
   a shorter practice run.
3. Draw without replacement, preferring questions the person has seen least recently —
   so a second attempt is not the first attempt again.
4. If a category cannot fill its quota, take what exists and **record both the shortfall
   and the target actually used for the draw on the attempt** (§2.8) — not just the
   delta. Never backfill from another category: a form that quietly over-samples
   Chemistry to cover a thin Physics bank produces a score that means nothing. Storing
   only the delta made the disclosure unauditable — a bug that failed to detect a real
   shortfall was indistinguishable from "no shortfall occurred" (review finding #3), and
   the bank changes over time so the target can't be recomputed after the fact without
   it. S4 self-verifies by recomputing actual per-category counts from the stored
   answers against the stored targets, rather than trusting the recorded shortfall
   blindly.
5. Try to meet each overlay's `targetShare` within the already-chosen set; report but do
   not enforce.
6. Shuffle presentation order, and shuffle option order per question — the position of
   the correct answer must not be learnable.

## 2.8 Progress store

One localStorage key, `praxis-practice`, holding one object. This is the only live data
in the project and it has **no backup** (D-6) — session 3's adversarial review targeted
this section specifically and found real gaps, remediated below (review findings
#1–#9).

```json
{
  "storeVersion": 1,
  "attempts": [
    {
      "id": "att-2026-08-16-001",
      "testCode": "5165",
      "mode": "test",
      "status": "completed",
      "startedAt": "2026-08-16T14:02:11.000Z",
      "finishedAt": "2026-08-16T16:44:03.000Z",
      "timeLimitMinutes": 180,
      "formLength": 66,
      "categoryTargets": [{ "categoryId": "II-B", "target": 7 }],
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

### Write cadence and resumability (findings #1, #10)

**The attempt record is written to storage after every answer, not only at the end.**
This is the fix, not a detail: "resumable" was stated in §1.2 as a requirement with
nothing in the schema to satisfy it until this field existed.

- `status` is `"in-progress"` from the moment Start is pressed, `"completed"` once
  scored, or `"abandoned"` if a newer attempt on the same test is started while this one
  is still `"in-progress"` — at most one `in-progress` attempt exists per test code at a
  time.
- S2's résumé lookup is: find the attempt for this test code with `status:
  "in-progress"`, if any, and offer to resume it at its next unanswered question.
- If wall-clock time (`startedAt + timeLimitMinutes`) has already passed when the site
  loads that attempt, it is not silently scored — S3 shows the "time expired while you
  were away" screen first, then scores on acknowledgment.
- `questionHistory` updates on the **same per-answer cadence** as the attempt, so a
  tab closed mid-test still credits every question actually seen to the spaced-repetition
  schedule and the "least recently seen" draw preference in §2.7 — not only the questions
  that happened to fall before the tab closed and the attempt was later abandoned.

### Cross-tab writes (finding #2)

localStorage has no cross-tab locking; a naive read-modify-write from two open tabs lets
one silently discard the other's data with no error. The site listens for the browser's
`storage` event and, on detecting an external write to this key, reloads in-memory state
from the new value (or, if the current tab has unsaved in-progress work, warns before
overwriting) rather than blindly writing over it.

### Shortfall auditability (finding #3)

`categoryTargets` records the per-category quota **actually used for the draw** that
day, alongside `shortfalls`' delta — not the delta alone. The bank grows over time, so
without the target on record, a shortfall could never be distinguished after the fact
from "shortfall detection didn't run." S4 recomputes actual per-category counts from
`answers` against `categoryTargets` and self-verifies against the stored `shortfalls`
rather than trusting it blindly.

### Storage failures (finding #6)

A write that throws (e.g. `QuotaExceededError`) surfaces a visible error rather than
silently discarding the attempt that triggered it. A read that fails to parse shows an
explicit "store unreadable" state **without touching the raw stored value** — leaving it
inspectable and manually recoverable via devtools — rather than catching the error and
quietly reinitializing an empty store, which would be silent total data loss for a
project with no backup.

### Export (finding #9)

S2 offers a **"download my progress"** action that serializes the whole store to a JSON
file. This is the cheapest available mitigation against cross-tab loss, storage
failures, and a person clearing site data by hand — all three leave this file as a
manual, out-of-band recovery path the schema otherwise provides nothing for.

### Spaced repetition (D-8; finding #4)

An SM-2-style schedule, deliberately the simple version. **A question's first-ever
answer initializes `intervalDays: 1, ease: 2.5`** (standard SM-2 defaults) before the
recurrence below applies — the original schema specified the recurrence but never its
starting point. Then: correct answer → `intervalDays = max(1, round(intervalDays ×
ease))` and a small ease increase; incorrect → `intervalDays = 1` and an ease decrease,
floored at 1.3. `dueAt = now + intervalDays`. Questions never seen have no history entry
and are drawn as new.

### Retention (finding #8)

Only the **immediately-prior** version's backup key is retained; an older
`praxis-practice.backup.v{n}` is pruned at the next migration. `attempts` and
`questionHistory` are otherwise kept in full — no pruning of study history itself, only
of migration backups — since localStorage's ~5–10 MB quota comfortably outlasts any
realistic study volume at this project's scale.

### Versioning — the one migration that can lose real data

The launch methodology's expand/contract discipline applies here in full:

- `storeVersion` is checked on every load.
- **Before any migration runs, the pre-migration value is copied to
  `praxis-practice.backup.v{n}` and left there** (retention rule above). This is the
  core of the safety net; it must land in Phase 0, not when the first migration is
  needed (BACKLOG.md B-6).
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
- **5165's on-screen graphing calculator — a scope narrowing, not yet a decision.**
  BLUEPRINT.md's F-3 describes the real exam as providing an interactive graphing
  calculator; D-12 scoped only a static formula/notation reference for 5165, and that
  narrowing went unflagged until session 3's review caught it (finding #14 — see
  REVIEW.md's "Escalate" section for the three options and their tradeoffs). **Open,
  pending the session owner's decision.** No question should be authored that assumes a
  calculator exists on the site until this resolves.
