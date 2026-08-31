# Roadmap

**Companion documents:** [SCHEMA.md](SCHEMA.md) · [BLUEPRINT.md](BLUEPRINT.md) ·
[REVIEW.md](REVIEW.md) · [DECISIONS.md](DECISIONS.md)

Design stage complete ([BLUEPRINT.md](BLUEPRINT.md), [SCHEMA.md](SCHEMA.md),
[REVIEW.md](REVIEW.md), the coding plan below). Phase 0 complete: the verification gate
(0.1), the progress-store safety net (0.2, code-reviewed — 7 findings fixed), and the
static page skeleton (0.3, live-tested) are all merged to `main`.

Deferred work is tracked as **GitHub issues**, not a backlog file — see D-16.

**Status legend:** ☐ not started · ◐ in progress · ☑ complete and live-tested

### Where the seed document stands

The methodology's step 2 has the project owner write the seed document, and the design
stage takes it as its single input. No seed document was written here; the design
answers arrived directly in conversation instead. [SEED.md](SEED.md) is a
**Claude-drafted stand-in** capturing those answers, awaiting the project owner's
correction — treat it as a starting point to edit, not as the owner's own statement of
intent. The distinction matters because the seed is what every downstream document is
checked against.

## Approved design plan (D-7)

| # | Session | Produces | Model / effort | Status |
| --- | --- | --- | --- | --- |
| 1 | Blueprint extraction | [BLUEPRINT.md](BLUEPRINT.md) — per test: content categories, weightings, question count, time limit, stated item formats. Facts only, no ETS content. | Strongest / high | ☑ Complete |
| 2 | Requirements + data schema | [SCHEMA.md](SCHEMA.md) — screens and behavior; the question-bank file format; the saved-progress record including D-8's attempt history; the registration mechanism that makes D-4's "add a test without code changes" true; accessibility requirements; explicit non-goals. Closes B-1 and B-2. | Strongest / max | ☑ Complete |
| 3 | Adversarial review | [REVIEW.md](REVIEW.md) — 19 findings from fresh, context-free sessions on progress-store data integrity and runner UX/accessibility; 18 remediated directly in SCHEMA.md, 1 escalated (5165 calculator, B-7). | Fresh sessions / max | ☑ Complete |
| 4 | Coding plan | Phases 0–n below, walking-skeleton shaped. | Strongest / extra-high | ☑ Complete |

**Session 2 is the load-bearing one** and is scheduled at max effort for that reason.
Three separate constraints all land in it and are each expensive to retrofit: D-4 makes
"a fifth test needs no code changes" a hard requirement; D-6 and D-8 put a live,
un-backed-up store with per-question attempt history in the browser; and BLUEPRINT.md's
F-4 and F-6 mean the category model must be a variable-depth tree with orthogonal
overlay tags, not a flat two-level scheme.

**Why the eight-session version was cut to four:** see D-7. In short, the deliverables
that were dropped (API spec, operations/cost review, staged-exposure planning, a
standalone visual-design pass) have no subject matter in a static single-user offline
site with no server.

## Phase overview

| Phase | Theme | Status |
| --- | --- | --- |
| 0 | Tools & infrastructure | ☑ |
| 1 | Walking skeleton | ☑ |
| 2 | Core data & persistence | ☑ |
| 3 | Runner completeness | ☑ |
| 4 | Study mode & dashboard depth | ☑ |
| 5 | Reference materials (5165, 5485) | ☑ |
| 6 | Hardening | ☑ |
| 6.5 | Workflow & progress dashboard | ☑ |
| 6.6 | Progress dashboard visual redesign | ◐ |
| 6.7 | Restore progress ("upload progress") | ☑ |
| 6.8 | S2 redesign (test-menu hub) | ☑ |
| 6.9 | Topic teaching pages ("Study a topic") — Mathematics | ☑ |
| 6.10 | Topic teaching pages — remaining three subjects | ◐ |
| 6.11 | Landing page visual refresh | ☑ |
| 7 | Content authoring (parallel track) | ☑ |
| 7.1 | History-aware draw for Practice a topic / Category test | ☑ |
| 7.2 | Supplemental authoring — 5165 Functions & Calculus | ☑ |
| 8 | Launch (NAS) — v1, Mathematics only | ◐ |
| 9 | Multi-subject entry (S1 redesign) | ☑ |
| 10 | Final testing & acceptance (all four subjects) | ☐ |

## Phases (post-design)

Design session 4's output. Governed by [SCHEMA.md](SCHEMA.md) (screens, data model,
progress store) and [REVIEW.md](REVIEW.md) (remediated requirements). Walking-skeleton
shaped per `design-methodology.md` step 7: one thin end-to-end path first (Phase 1),
then flesh. Content authoring (Phase 7) is a **parallel track**, not gated on the engine
phases — BLUEPRINT.md's F-1 already flagged it as the project's dominant cost (411
questions vs. an estimated 4–6 sessions of engine work), so it starts as soon as the
schema is stable (after Phase 2) and runs alongside Phases 3–6 as its own batch
sessions.

Every phase ends live-tested by the session owner, served locally (Phase 0 sets up how).
Tasks are sized to touch at most ~5 files with acceptance criteria that fit in three
bullets, per the methodology; the lists below are phase/sub-phase level, and each
sub-phase gets its own two-line plan-and-go at the start of the session that implements
it — Gate 1 applies per sub-phase, not just once for the whole plan.

### File layout (proposed)

No build step (D-3): multiple plain HTML pages rather than a client-side router, so the
site works identically opened via `file://` or served from the NAS, and a non-framework
reader can trace "what renders S3" straight to `run.html`.

```
index.html            S1 — index
test.html              S2 — test menu       (?code=5165)
run.html                S3 / S5 — runner & topic study  (?code=5165&mode=test|study[&category=I-B])
results.html            S4 — dashboard       (?attempt=att-...)
css/base.css
js/
  store.js             progress store: load/save/migrate/backup/export (SCHEMA.md §2.8)
  schema.js            manifest + bank loader, category tree, weight-correct form assembly (§2.4–2.7)
  srs.js               spaced-repetition scheduler (SM-2 bootstrap + recurrence)
  runner.js            S3 state machine: timer, flag, advance, review pass, submit
  results.js           S4 rendering + shortfall self-verification
  calculator.js        5165 scientific calculator widget (D-14)
  reference-panel.js   shared non-modal reference-panel component (5165, 5485)
data/
  manifest.json
  tests/{5101,5165,5485,5652}.json
  reference/{5165-formulas,5485-periodic}.json
tools/
  verify.mjs           local gate — pure Node, no npm install (see Phase 0.1)
```

### Phase 0 — Tools & infrastructure

Establishes the ground everything else stands on.

- ☑ **0.1 Local verification gate.** `tools/verify.mjs`, plain Node (the machine has
  Node 22; no `package.json`, no install step — the gate must not become the site's
  first dependency).
  *Accepts:* every bank file is validated against SCHEMA.md's shape (`schemaVersion`
  present, category weight counts sum to the test's total, every question `id` unique
  and namespaced correctly, `correct` references real option ids, `format` values are
  one of the known three); unimplemented `type` values warn rather than error (D-10).
  *Complete.* Unit-tested in `tools/test-verify.mjs` against two fixtures
  (`tools/fixtures/`) — 14 tests, all passing. This is now the *only* gate — see
  CLAUDE.md's Verification section for the exact commands.
- ☑ **0.2 Progress-store safety net.** `js/store.js`: `loadStore`/`saveStore` plus the
  backup-before-migrate mechanism from SCHEMA.md §2.8.
  *Accepts:* never migrates a newer-than-supported store downward; backs up before
  migrating an older one; prunes to the immediately-prior backup only regardless of
  whether the migration chain completes; every failure mode (corrupted JSON, `NaN`
  version, a failed write, a storage exception mid-migration) returns a tagged result
  instead of throwing or silently reinitializing (finding #6).
  *Complete.* Success and failure never share the `store` key, so a caller that skips
  the `ok` check gets `undefined` rather than a plausible-looking rejected object. Run
  through a 5-angle `/code-review` before merge (Gate 3 — this is the
  progress-persistence layer, a deep change) — 7 findings, all fixed. Unit-tested
  against a mock Storage implementation in `tools/test-store.mjs` — 18 tests, all
  passing. Closes [issue #4](https://github.com/homesik92/PRAXIS-Practice/issues/4).
  Attempt/answer read-write helpers (write-per-answer cadence, résumé lookup, spaced
  repetition) are Phase 2.2, not this — this is only the envelope and the safety net
  underneath it.
- ☑ **0.3 Static skeleton.** `index.html`, `test.html`, `run.html`, `results.html`,
  `css/base.css` — the file layout above, `manifest.json` with zero tests registered
  (from 0.1), `data/tests/` still empty.
  *Accepts:* all four pages exist per the file layout and load locally with no console
  errors.
  *Complete.* `.claude/launch.json` added (a plain `python3 -m http.server`) so the
  site can be locally served rather than opened via `file://`, per D-17. Live-tested in
  the Browser pane: all four pages load with no console errors, correct titles, CSS
  applies. **Phase 0 complete.**

### Phase 1 — Walking skeleton

One test (5165, arbitrarily — the smallest bank at 66 questions), one thin path,
end-to-end, deliberately minimal (no flagging, no review pass, no spaced repetition yet):

- ☑ **1.1 Placeholder bank and registration.** `manifest.json` registers 5165 with a
  **5-question placeholder bank** (real content, not lorem ipsum — but not the
  66-question production bank). S1 lists it; S2 offers *take a test*.
  *Accepts:* S1 shows 5165 with a question count of 5; choosing it reaches S2's *take a
  test* entry.
  *Complete.* `data/tests/5165.json` — 5 original questions (never adapted from the
  gitignored ETS PDFs), one or two per top-level category (I Number & Quantity/Algebra
  ×2, II Functions/Calculus, III Geometry, IV Statistics & Probability), weight-bearing
  counts summing to `formLength: 5` and percents to the real blueprint's 30/30/20/20.
  `js/schema.js` — `loadManifest`/`loadBankSummary`/`loadTestList`, injected-`fetch`
  and Node-testable like `store.js` is injected-`storage`-testable; `tools/test-schema.mjs`,
  9 tests, all passing. `index.html`/`test.html` gained inline module scripts calling it;
  no dedicated page-wiring files, matching the no-build-step, plain-HTML approach.
  Verified live in the browser: S1 lists "Mathematics — 15 min, 5 questions"; S2 shows
  the test name and a *Take a practice test* link (to `run.html`, which task 1.2
  builds); a missing or unregistered `?code=` each show a plain status message instead
  of a blank or broken page. `node tools/verify.mjs` and all three test files green.
- ☑ **1.2 Minimal test runner.** S3: Start → timer → single-select question → advance
  on answer → auto-score at the end. No flag control, no review pass yet (Phase 3).
  *Accepts:* all 5 placeholder questions can be answered in sequence and the run
  auto-scores at the end.
  *Complete.* `js/runner.js` — pure `scoreAttempt(bank, answers)`, Node-tested
  (`tools/test-runner.mjs`, 6 tests) the same way `schema.js`/`store.js` are; `run.html`
  owns all DOM/timer wiring inline (Start click, wall-clock countdown display, radio
  rendering, advance-on-select — the last of these is SCHEMA.md's actual final S3
  behavior, not a simplification). Hands off to S4 via a `sessionStorage` placeholder
  keyed by `results.html?attempt=att-...`, explicitly **not** `store.js`'s real
  `STORAGE_KEY` — Phase 2.2's attempt-record store replaces this wholesale. **Left out
  deliberately:** the countdown has no enforcement — it doesn't auto-submit at zero;
  SCHEMA.md's time-expired-while-away handling is Phase 3.3's. Verified live in the
  browser: played all 5 questions with a deliberate wrong answer on one, redirected to
  `results.html?attempt=...`, and inspected `sessionStorage` directly — score was
  exactly `4/5` overall with `I: 1/2` (the wrong one), `II`/`III`/`IV` each `1/1`,
  matching hand-computed expectations. No console errors. All four test files green
  (49/49) plus `verify.mjs` clean.
- ☑ **1.3 Minimal results dashboard.** S4: overall score and a bare per-category
  percentage.
  *Accepts:* S4 shows the correct overall score and at least one per-category
  percentage for the 5-question run.
  *Complete.* `js/results.js` — pure `summarizeAttempt(attempt, bank)`, Node-tested
  (`tools/test-results.mjs`, 5 tests), walking the category tree recursively so it
  already handles Phase 2's variable-depth trees, not just today's flat placeholder
  one. `results.html` reads `?attempt=` from the URL, looks up 1.2's `sessionStorage`
  hand-off, re-fetches the bank for category labels, and renders the overall score plus
  a per-category line. Handles a missing `?attempt=` and an attempt not found in
  `sessionStorage` (e.g. the link opened in a new tab) with plain status text instead
  of a blank or broken page. Verified live in the browser: a full run scored 4/5
  overall with the exact right per-category breakdown, rendered under real category
  labels ("Number & Quantity and Algebra", not "I"); both edge cases confirmed
  separately. No console errors anywhere. All five test files green (54/54) plus
  `verify.mjs` clean.

**Live test at end of phase 1 — passed.** Ran the complete path from `index.html`:
picked 5165 on S1, "take a practice test" on S2, played all 5 questions on S3 with
running countdown, landed on S4 with an accurate score and per-category breakdown. This
is the phase that proves the architecture before the other three tests or any
hardening gets built on top of it.

### Phase 2 — Core data & persistence

- ☑ **2.1 Full category and form-assembly engine.** `schema.js`: all four tests
  registered, variable-depth category tree (§2.4), overlay tags (§2.5), weight-correct
  form assembly with disclosed shortfalls (§2.7) — replaces Phase 1's placeholder draw
  logic.
  *Accepts:* each test's assembled form matches its blueprint weighting exactly, or
  reports an explicit shortfall when it can't.
  *Complete.* `assembleForm(bank, {formLength, history, random})` in `js/schema.js` —
  collects weight-bearing leaf categories, scales targets by the largest-remainder
  method when `formLength` is overridden, draws preferring least-recently-seen (via an
  injected `history`, always `{}` today since Phase 2.3 doesn't exist yet), never
  backfills a thin category from another, reports (never enforces) overlay
  `targetShare` coverage, and shuffles presentation/option order via an injected
  `random` for deterministic tests. All four tests now registered in
  `data/manifest.json`: `5101`/`5485`/`5652` are real stub banks — accurate top-level
  category weights straight from BLUEPRINT.md, correct `formLength`, **zero
  questions** (honest 100% shortfall, Phase 7's job to fill) — deliberately without
  subcategories, left for each test's first authoring session to pin, informed by
  real content. `5165`'s existing placeholder is untouched (still simplified
  top-level categories, not the real weight-bearing subcategory split — reconciling
  that now would mean either fabricating dozens more placeholder questions or
  spreading 5 across 6 categories too thin to demonstrate anything).
  `run.html` now calls `assembleForm` instead of using `bank.questions` as given, and
  computes it once before the Start screen renders — not inside the Start click
  handler — so the advertised count is always what's actually delivered and a
  contentless test never shows a dead-end Start button.
  **`/code-review` at high effort (8 angles) found 10 real findings, 9 fixed
  in this PR**, several independently caught by more than one angle: a dead Start
  button after the empty-form guard (the `once: true` listener was consumed before
  the early return); the Start screen and the stored attempt record both trusted
  `bank.formLength` instead of what was actually delivered; a question mistagged to a
  non-leaf ancestor category was silently invisible to every draw with nothing in
  `verify.mjs` to catch it; an overlay missing `targetShare` silently produced `NaN`;
  a malformed `lastSeenAt` could defeat recency ordering via `NaN`'s sort-comparator
  coercion to "equal"; a tie-break relied on an unstated `Array.sort` stability
  guarantee; and a per-category draw re-filtered the full question list instead of
  one grouping pass. `tools/verify.mjs` gained two new checks as a result (weight-bearing-leaf
  `categoryId`, numeric `targetShare`), both regression-tested against the fixture
  banks. **One finding left deliberately unfixed:** `assembleForm` returns a plain
  object rather than the codebase's `{ok, reason}` tagged-result convention — real,
  but reworking the return shape now would touch 20 tests for a caller that doesn't
  exist yet; revisit when Phase 2.4 builds the disclosure screen that actually
  consumes shortfalls.
  Live-verified in the browser after every fix: the empty-bank guard now shows status
  directly with no dead button; 5165 plays through correctly end to end (shuffled
  presentation and option order, correct score, correct per-category breakdown) both
  before and after the `drawForCategory` refactor. `node tools/verify.mjs` clean; all
  five test files green, 65/65 (`test-schema.mjs` 20, `test-verify.mjs` 16 — both grew
  from the review's fixes — `test-results.mjs` 5, `test-runner.mjs` 6, `test-store.mjs`
  18).
- ☑ **2.2 Full progress store.** `store.js`: attempt records with `status` and
  per-answer write cadence (real resumability, finding #1), cross-tab `storage`-event
  reconciliation (finding #2).
  *Accepts:* closing and reopening the tab mid-attempt resumes at the last-answered
  question; two tabs open at once don't silently discard each other's writes.
  *Complete.* `js/store.js` — `startAttempt`/`recordAnswer`/`completeAttempt`
  (attempt lifecycle, at-most-one-in-progress-per-testCode enforced), `findInProgressAttempt`/
  `findAttempt` (résumé and results lookups), `handleStorageEvent` (cross-tab
  reconciliation, reusing `loadStore` rather than parsing the event's raw value).
  Résumé needed a real gap closed first: `assembleForm` draws and shuffles randomly,
  so nothing let a reload reconstruct the *same* question/option order a person was
  partway through. Added `questionOrder` to SCHEMA.md §2.8's attempt record (**D-19**)
  — the exact drawn sequence, captured once at Start — and `js/schema.js`'s
  `resumeForm(bank, questionOrder)` replays it instead of re-drawing. `run.html`
  rewritten: checks for an in-progress attempt before ever showing Start, résumés
  straight into the run screen at the next unanswered question with the timer
  continuing from the attempt's real `startedAt` (not restarted), and every answer
  now calls `recordAnswer` + `saveStore` immediately rather than accumulating only in
  memory. `js/runner.js`'s `scoreAttempt` answer shape changed from
  `{selectedOptionId}` to `{chosen: string[]}` to match the real stored record
  exactly. `results.html` now reads the real store instead of Phase 1's
  `sessionStorage` placeholder and recomputes the score itself from `attempt.answers`
  every time (SCHEMA.md's self-verification principle), rather than trusting a cached
  value — nothing is cached at all now.
  **`/code-review` at high effort (8 angles) found 10 findings, 8 fixed, 2 deliberately
  deferred.** Several were independently caught by 3–5 angles at once, a strong
  real-defect signal: résumé crashed with an uncaught exception if a stored
  `questionOrder` referenced a question or option no longer in the bank (contradicting
  D-19's own stated rationale about bank drift) — `resumeForm` now returns `null`
  instead, and `run.html` shows a plain message rather than a broken page. Two tabs
  resuming the *same* attempt and answering within the same round trip, before either
  processed the other's `storage` event, could each append a duplicate answer for one
  question — `recordAnswer` is now idempotent per `questionId`. A tab sitting on the
  Start screen while another tab already created an attempt for the same test would
  have silently erased it outright via `saveStore`'s unconditional overwrite, no
  `"abandoned"` marker at all — the Start-click handler now re-checks against a
  freshly reloaded store, not the page-load snapshot. `results.html` never checked
  `attempt.status`, so a stale link to an in-progress or abandoned attempt rendered a
  partial score presented identically to a real final one — now gated on `status`. A
  failed save on the last answer showed a warning and then navigated away in the same
  tick, before it could be read — now halts instead, consistent with how an earlier
  save failure already behaved. A fully-answered attempt stuck at `"in-progress"`
  (that last finding's root cause, before the halt fix) would crash on every future
  reopen via an out-of-bounds array read — `beginRun` now detects this and retries
  `finish()` instead, which is self-healing: the same path that would have crashed
  now quietly completes the attempt correctly. Two duplicated-logic findings also
  fixed: a shared `findAttemptIndex` helper in `store.js`, and `résumé`'s
  reconstruction logic (previously untested inline HTML script) extracted to
  `js/schema.js`'s tested `resumeForm`. **Deliberately deferred, both filed as
  accepted architectural debt rather than fixed here:** the cross-tab `storage`
  listener has no explicit `removeEventListener` (safe today since every path reaches
  `beginRun` at most once per page load); and `run.html`'s `beginRun` is accumulating
  the state-machine logic (timer, cross-tab sync, render/answer loop) that
  ROADMAP.md's own file-layout doc already earmarks for `runner.js` in Phase 3 — this
  task made that extraction not easier, noted for whoever does it.
  Live-verified in the browser, including the specific failure scenarios the review
  found: a real two-tab session (one tab answers, the other resyncs via the `storage`
  event with zero interaction, confirmed by screenshot); a corrupted `questionOrder`
  injected directly into `localStorage` showing the plain message instead of
  crashing; a fully-answered stuck `"in-progress"` attempt self-healing into a correct
  completed result on reopen; and `results.html` correctly refusing to score an
  in-progress attempt. `node tools/verify.mjs` clean; all five test files green,
  86/86 (`test-schema.mjs` 24, `test-store.mjs` 33 — both grew from the review's
  fixes — `test-results.mjs` 5, `test-runner.mjs` 8, `test-verify.mjs` 16).
- ☑ **2.3 Spaced repetition scheduling.** `srs.js`: SM-2 bootstrap values and
  recurrence (finding #4), `questionHistory` wired to the runner's per-answer writes.
  *Accepts:* every answered question gets a `dueAt` computed from SM-2's bootstrap
  values, and answering it again reschedules it.
  *Complete.* New `js/srs.js` exports a single pure function, `updateHistory(entry,
  correct, now)`: bootstraps `intervalDays: 1, ease: 2.5` on a question's first-ever
  answer (SCHEMA.md §2.8), then applies the SM-2 recurrence — correct →
  `intervalDays = max(1, round(intervalDays × ease))`, `ease += 0.1`; incorrect →
  `intervalDays = 1`, `ease -= 0.2` floored at 1.3. The exact ease deltas were
  previously unspecified in SCHEMA.md beyond "small"/"floored at 1.3"; pinned to the
  standard SM-2 constants and logged as **N-4**, since the pre-existing 1.3 floor was
  itself already the standard value. `run.html`'s `selectAnswer` now folds a
  `questionHistory` update into the same `saveStore` call as each answer, and its
  `assembleForm` call passes `store.questionHistory` as real `history` — activating
  2.1's least-recently-seen draw preference, dead code until now (always `{}`).
  **`/code-review` at high effort (8 angles) found 7 findings, 5 fixed in this PR.**
  Three independent angles (altitude, reuse, and partially simplification) converged
  on the same real issue: the `questionHistory` store-merge was inlined ad hoc in
  `run.html` instead of going through `js/store.js` (the file that owns every other
  store mutation, and whose own `recordAnswer` doc comment had explicitly anticipated
  this write landing there) — fixed by adding `js/store.js`'s `recordQuestionHistory`
  helper and an explicit `recorded: boolean` flag on `recordAnswer`'s return, replacing
  a fragile reference-equality check (`nextStore !== store`) that silently depended on
  an implementation detail. Also fixed: an unguarded `store.questionHistory[id]` read
  with no fallback for a missing/corrupted `questionHistory` object (now defaults to
  `{}`, matching this app's established tolerance for hand-edited localStorage); and a
  stale comment in `js/schema.js`'s `lastSeenRank` claiming history wasn't reachable
  from `run.html` yet. **One finding deliberately deferred**, filed as
  [GitHub issue #22](https://github.com/homesik92/PRAXIS-Practice/issues/22): a
  cross-tab race where two tabs answering the same question near-simultaneously can
  double-apply or clobber an SM-2 update — the same already-accepted residual gap
  Phase 2.2's `storage`-listener reload can't fully close, now touching one more
  field. Live-verified in the browser end to end (a 5-question 5165 run, confirming
  `questionHistory` populates correctly with the right `seen`/`correct`/`dueAt`/
  `intervalDays`/`ease` values, and that answering a previously-seen question again
  builds on its prior state rather than re-bootstrapping) both before and after the
  code-review remediation. `node tools/verify.mjs` clean; all six test files green,
  99/99 (`test-srs.mjs` new at 8, `test-store.mjs` grew to 38 from the review's fixes,
  `test-schema.mjs` 24, `test-runner.mjs` 8, `test-results.mjs` 5, `test-verify.mjs`
  16).
- ☑ **2.4 Shortfall audit trail.** `categoryTargets` persisted alongside `shortfalls`;
  S4 self-verifies against them (finding #3).
  *Accepts:* S4's reported shortfall matches a value recomputed independently from
  stored per-category counts.
  *Complete.* `categoryTargets`/`shortfalls` were already persisted on the attempt as
  of Phase 2.1/2.2 — the actual gap was that `results.html` never read or surfaced
  either. `js/results.js`'s `summarizeAttempt(score, bank, categoryTargets)` gained a
  new `recomputeShortfalls` step: for each recorded target, `got` is the actual
  delivered/answered count from `scoreAttempt`'s `byCategory` (defaulting to 0 for a
  category absent entirely — the 100%-shortfall case), compared fresh against
  `categoryTargets`, matching this file's existing "never trust a cached value"
  pattern for the score itself. The recomputed value is what's displayed;
  `attempt.shortfalls` (the value recorded at draw time) is not read or cross-checked
  live — logged as **N-5**, since this deviates from SCHEMA.md §2.8's literal
  "self-verifies against the stored shortfalls" wording (chosen at the plan-approval
  step, confirmed when code review raised it again). `results.html` now renders a
  visible "This attempt isn't fully representative" section per SCHEMA.md §1.2's
  requirement that an underfilled bank is disclosed, not silently padded.
  **`/code-review` at high effort (8 angles) found 4 findings, 1 fixed.** The
  conventions angle caught the N-5 gap above (fixed by logging the decision). Angle A
  found a real, pre-existing characteristic this PR inherits rather than introduces:
  the "got" side of the comparison is derived from `scoreAttempt`'s `byCategory`,
  which re-looks-up each question's `categoryId` from whatever bank is live when
  `results.html` loads — not the bank as it existed at draw time — a dependency the
  per-category score breakdown has had since Phase 1.3. Filed as
  [issue #25](https://github.com/homesik92/PRAXIS-Practice/issues/25) (fixing it
  properly needs a `questionOrder`-style per-question category snapshot at draw time,
  touching `assembleForm`/`startAttempt`, and affects score display too — out of scope
  for a results-display PR); the overclaiming docstring language was tightened in the
  same fix. Two low-severity duplication findings (the `got < wanted` predicate
  echoed between `schema.js` and `results.js`; two structurally similar `<li>`-loops
  in `results.html`) left as-is — different moments/inputs for the first, matches this
  codebase's existing no-shared-DOM-helper convention for the second. Live-verified in
  the browser: the no-shortfall case (5165's real content, targets match delivered
  counts exactly) renders nothing extra; an injected shortfall (`categoryTargets`
  edited directly in `localStorage` to exceed delivered counts) renders the correct
  category label and counts with no console errors. `node tools/verify.mjs` clean;
  all six test files green, 105/105 (`test-results.mjs` grew from 5 to 11).

**Schema is stable after this phase** — Phase 7 (content authoring) can start here,
in parallel with Phases 3–6.

### Phase 3 — Runner completeness

- ☑ **3.1 Flag and review pass.** Flag-toggle control (finding #13) + end-of-run review
  pass: list with stem excerpt and category per row (finding #16), reopen and change
  any answer.
  *Accepts:* every flagged question appears in the review list; reopening and changing
  an answer there updates the stored attempt.
  *Complete.* `js/store.js` gained `updateAnswer` (replace-in-place, distinct from
  `recordAnswer`'s append-only idempotent semantics) plus a shared
  `requireInProgressAttempt` precondition helper factored out of `recordAnswer`/
  `updateAnswer`/`completeAttempt` on code review. `js/runner.js` gained
  `excerptStem`/`buildReviewRows`; `js/results.js`'s `flattenCategoryLabels` is now
  exported for reuse. `run.html` gained a keyboard-operable flag checkbox per
  question, a review screen (reopen any row to change its answer or flag, Submit to
  score), and a `priorHistory` field on each answer record (N-6) so a review-pass
  answer change corrects spaced-repetition history from the same frozen baseline
  instead of double-counting a corrected answer as two SM-2 events — a genuine design
  fork put to the session owner rather than decided solo. Résumé of a fully-answered
  attempt now lands in the review pass rather than auto-scoring, extending the review
  pass to be the universal gate between last-answer and scoring. `/code-review` at
  high effort (8 parallel angles) found 8 findings: a real crash reopening a
  corrupted/answerless review row (fixed with a graceful status message, not a
  crash), stale Start-screen copy contradicting the new review pass (fixed), a latent
  stale-reference bug in the edit-commit path (fixed), missing test coverage for
  `priorHistory` surviving an edit (fixed), plus three reuse/simplification findings
  (fixed: `findAttempt` reuse, the shared precondition helper, dropping a redundant
  `currentFlagged` variable that just mirrored the checkbox's own DOM state). One
  finding — `updateAnswer` has no cross-tab conflict guard, so a simultaneous
  review-pass edit in another tab can clobber this tab's — deferred as
  [issue #28](https://github.com/homesik92/PRAXIS-Practice/issues/28), same narrow
  shape as the already-accepted issue #22. Live-verified in the browser: flag → answer
  all 5 → review list shows correct flag/category/excerpt per row → reopen and change
  an answer → SRS history recomputes without double-counting (`seen` stays 1, not 2)
  → Submit scores correctly; also verified the corrupted-row Reopen guard directly by
  hand-editing a stored answer's `questionId`. 120/120 tests green, `verify.mjs`
  clean.
- ☑ **3.2 Confirm-before-submit.** Dialog showing unanswered/flagged counts before
  scoring (finding #11).
  *Accepts:* the dialog's counts match the actual number of unanswered and flagged
  questions at submit time.
  *Complete.* `js/runner.js` gained a pure `countReviewStatus(rows)` taking
  `buildReviewRows`' output and returning `{unanswered, flagged}`, unit-tested
  alongside 3.1's helpers. `run.html`'s Submit button now opens a native `<dialog>`
  (zero-dependency, built-in focus trap and Esc-to-close, consistent with D-3) stating
  both counts before scoring; the dialog's own Submit button calls the existing
  `finish()`, Cancel or Esc leaves the attempt untouched and in-progress. Focus
  explicitly returns to the Submit button on every close path via the dialog's `close`
  event, rather than relying on browser-specific restoration. Minimal CSS added to
  `css/base.css` matching the project's existing plain style. Shallow UI change per
  Gate 3 (self-reviewed, no code-review round). Live-verified in the browser via
  script-driven clicks on a genuinely fresh tab with a click-event logger installed
  (per this project's known stray-real-click landmine) to confirm every state
  transition was explicitly triggered: a normal complete run showed "0 questions
  unanswered, 1 question flagged"; Cancel left the attempt `in-progress` with correct
  focus restoration; Submit scored and navigated to results. Also hand-edited a stored
  attempt's `answers` (same technique as 3.1's corrupted-row test) to cover only 4 of
  5 questions, confirming the dialog correctly read "1 question unanswered, 1 question
  flagged" and matched the review list exactly. 123/123 tests green, `verify.mjs`
  clean.
- ☑ **3.3 Résumé flow.** S2's "Resume attempt" entry (finding #10), the
  time-expired-while-away screen.
  *Accepts:* an in-progress attempt resumes at its saved position; one whose deadline
  passed while the tab was closed shows the expired screen instead of silently scoring
  on load.
  *Complete.* `test.html` now checks for an in-progress attempt on load and, when one
  exists, leads with a "Resume attempt" entry (with an "X of Y answered" status line)
  ahead of "Take a practice test" — a pure discoverability fix, since `run.html`'s own
  résumé lookup already handled the underlying behavior identically either way. A
  store-load failure here is skipped silently rather than surfaced, since this is only
  an entry point and `run.html` already reports storage failures robustly for the
  actual test-taking flow. `run.html` gained a wall-clock deadline check on résumé,
  checked before `resumeForm` since the expired path never needs the reconstructed
  form: if `startedAt + timeLimitMinutes` has already passed, a new expired-screen
  states the answered/total count and requires an explicit "See your results"
  acknowledgment before scoring — never silently scored on load. Separately, the
  running timer now calls the (renamed-in-place) `finish()` the instant it hits zero
  while the tab stays open, with no confirmation dialog, since a passed deadline is a
  forced outcome rather than a discretionary submit. The score-and-navigate logic
  (previously inline in `finish()`) was factored into a shared `completeAndGoToResults`
  helper used by both the expired-screen's acknowledgment and `finish()` itself.
  Shallow-to-moderate UI/logic change, self-reviewed (no schema or persisted-data
  shape change, no new dependency). Live-verified in the browser via script-driven
  clicks on a fresh tab with a click-event logger installed throughout (per this
  project's documented stray-real-click landmine): a normal résumé correctly showed
  "Resume attempt — 2 of 5 questions answered" and landed back at question 3; a
  hand-edited already-past deadline correctly showed the expired screen (not a silent
  score) and its acknowledgment correctly scored and navigated; and a live run caught
  at "Time remaining: 0:15" with the logger installed and zero clicks recorded
  navigated to results entirely on its own when the deadline hit — the verifying
  script was even killed mid-wait by the navigation itself, ruling out any click.
  123/123 tests green (no new pure logic to unit-test — this phase's additions are all
  DOM-wiring/timing), `verify.mjs` clean.
- ☑ **3.4 Runner accessibility pass.** Persistently-focusable timer/position element
  (finding #12), queued announcements (finding #15), a full keyboard-only run-through
  with no mouse.
  *Accepts:* a complete run — start to score — is achievable with the keyboard alone
  and a screen reader.
  *Complete.* `#timer`/`#position` gained `tabindex="0"` so they're reachable on
  demand independent of any announcement (finding #12). A static, never-rebuilt
  `aria-live="polite"` announcer region plus a serialized `announce()` queue was
  added so a position announcement and a threshold announcement can never fire
  simultaneously (finding #15): `renderQuestion`/`renderQuestionForEdit`/
  `showReviewScreen` all move focus and announce on every screen transition via a
  shared `transitionFocus` helper, and `updateTimer` announces 10/5/1-minutes-
  remaining exactly once each. `#status-note` gained `role="alert"` so a run-halting
  error is heard, not just shown. `/code-review` at high effort (8 parallel angles)
  found 10 findings, 9 fixed directly: a real correctness bug where threshold
  pre-suppression could suppress a fresh start's own threshold on a test sized to
  exactly 10/5/1 minutes (fixed by making pre-suppression apply only on a genuine
  résumé, threaded through as an explicit `resumingExistingTimer` flag — the
  threshold logic was also extracted to pure, unit-tested functions in
  `js/runner.js`, `initialAnnouncedThresholds`/`crossedThresholds`, closing the gap
  that let the bug hide); a WCAG-relevant finding that résumé forced focus onto the
  first question with no preceding user gesture (fixed via a `moveFocusOnFirstRender`
  flag distinguishing a genuine page-load résumé from every click-driven path,
  including the Start button's own cross-tab race-recovery branch); stale threshold
  announcements racing `finish()`'s navigation on a large time-jump (fixed by
  skipping the threshold loop once expired); `announce()`'s `requestAnimationFrame`
  stalling the whole queue while the tab is backgrounded plus no error recovery
  (fixed: dropped rAF for `setTimeout`, added a `.catch` guard, cut the per-message
  delay from 700ms to ~200ms); `<legend>`'s inconsistent cross-engine `.focus()`
  support (fixed by moving the focus target to the wrapping `<fieldset>`, which
  still gets its accessible name from the legend); `abortRun` not moving focus off
  the newly-focusable timer/position elements before hiding them, and `showStatus`
  lacking the same clear-then-set re-announce guard `announce()` uses (both fixed);
  plus a reuse/simplification finding (the focus+announce pairing duplicated across
  three call sites, extracted into the shared `transitionFocus` helper). One finding
  deferred: the cross-tab `storage` handler's re-render now also steals focus during
  a concurrent edit in another tab, a new manifestation of the already-accepted race
  documented in [issue #28](https://github.com/homesik92/PRAXIS-Practice/issues/28)
  (evidence comment added there rather than a duplicate issue). Live-verified in the
  browser via script-driven clicks with a click-event logger throughout: a fresh
  start correctly moves focus to the question fieldset every time; a résumé's first
  render leaves focus untouched while every subsequent transition moves it normally;
  the announcer queue fires each announcement in order with no clobbering (verified
  via a `MutationObserver` log); a live run caught at "1:00" remaining correctly
  announced "1 minute remaining" exactly once at the crossing, never retroactively
  when already below a threshold at résumé; `abortRun` correctly moves focus to the
  now-visible alert message. 131/131 tests green, `verify.mjs` clean.

### Phase 4 — Study mode & dashboard depth

- ☑ **4.1 Topic study screen.** S5: category picker (any depth of the tree), untimed,
  explanation shown immediately after each answer.
  *Accepts:* picking any category at any depth starts an untimed drill limited to that
  category, with the explanation visible right after each answer.
  *Complete.* Three new pure functions in `js/schema.js`: `flattenCategoryTree`
  (depth-annotated, so a `weight: null` study-filter subcategory is pickable too),
  `categoryAndDescendantIds` (a picked branch node studies everything under it, since
  questions attach only to leaf categories), and `assembleDrill` (every non-retired
  matching question, least-recently-seen first like the timed draw, no
  quota/shortfall). `run.html`'s `mode !== "test"` placeholder became a real third
  mode: no `&category=` shows a picker (flat indented list, real links so
  Back/reload work for free); picking one starts the drill. Per question: select an
  answer locks the radios, reveals correct/incorrect text plus the explanation, a
  "Next question" button advances. Each answer feeds `questionHistory` via the same
  SM-2 path S3 uses (`recordQuestionHistory`/`updateHistory`) — no attempt record is
  ever created, matching "no score is recorded against a test form" (confirmed live:
  `store.attempts` stayed `[]` throughout a full drill). A locally-tallied (not
  persisted) "X of Y correct" on a simple completion screen, with a "study again"
  link. `test.html` gained a "Study a topic" link. The existing `renderOptions` was
  generalized to take a `container` parameter so both S3 and S5 share it.
  `/code-review` at high effort (8 parallel angles) found 10 findings, 9 fixed
  directly: an unguarded `correctOption` lookup that could throw mid-reveal on a
  malformed bank; S5 had no cross-tab `storage` listener at all (unlike S3's
  `beginRun`), so a stale snapshot could silently overwrite a concurrent tab's
  whole attempt, not just an SRS edit — fixed by adding the same kind of listener
  S3 already has; a URL missing `&mode=` entirely showed the literal string "null"
  to the user after the dispatch was generalized; **the focus+announce pairing
  Phase 3.4 had already extracted into a shared `transitionFocus` helper for
  exactly this reason got reimplemented from scratch in `runStudy`** — hoisted into
  a `makeTransitionFocus` factory so both `beginRun` and `runStudy` get their own
  independent instance from one shared implementation; `categoryAndDescendantIds`
  rebuilt on top of `flattenCategoryTree`'s flat list instead of its own two-pass
  walk; `assembleDrill` reuses `drawForCategory` (called with an unlimited target)
  and a new shared `shuffleQuestionOptions` instead of re-deriving both; a
  redundant full-tree walk in `startDrill` just to fetch one label; the mode list
  enumerated in two places, now a single `VALID_MODES` source of truth; dead code
  (an unused `studyPickerHeading` const and its vestigial `tabindex`). One finding
  deferred as an architectural observation, not fixed now: `run.html` is
  accumulating multiple independent state machines in one module scope with no
  boundary between them, and `store.js` has no first-class distinction between an
  "attempt write" and a "history-only write" — both real, both bigger than this
  task's scope. Live-verified in the browser: picker → drill → reveal (both
  correct and incorrect paths) → complete screen, focus/announce behavior matching
  3.4's precedent (fresh entry never steals focus, every later transition does),
  `questionHistory` persisted correctly with zero `attempts` created, both new
  error messages (missing vs. unknown mode) read correctly, and a full S3
  regression pass confirmed the shared `renderOptions`/`transitionFocus`
  refactors didn't break the timed flow. 144/144 tests green (13 new for the
  schema.js functions), `verify.mjs` clean.
- ☑ **4.2 Full results dashboard.** S4: per-category correct/incorrect, full review
  list with explanations, shortfall disclosure surfaced legibly (not just logged).
  *Accepts:* every category shows a correct/incorrect count; a shortfall (from 2.4) is
  stated in the visible dashboard text, not just console/log output.
  *Complete.* Per-category correct/incorrect and the shortfall disclosure already
  existed (Phase 1.3/2.4); this task added the two pieces SCHEMA.md's S4 spec still
  needed: "time used" and "a full review list of every question with the chosen
  answer, the correct answer, and the explanation." `js/results.js` gained
  `formatElapsed` (startedAt/finishedAt → a human span, e.g. "2h 22m") and
  `buildFullReview`, which reconstructs the attempt's exact original question/option
  order via `js/schema.js`'s `resumeForm` (the same reconstruction run.html's résumé
  path already uses) and joins it against the stored answers, recomputing each row's
  `correct` via `js/runner.js`'s `isCorrect` rather than trusting the stored
  `answer.correct` field — SCHEMA.md §2.7's self-verifying principle, same as the
  existing score/shortfall logic. `results.html` renders one bordered block per
  question: full stem, all four options with chosen/correct marked in visible text
  (never color alone, SCHEMA.md S1.3), the explanation, and an unanswered-question
  case. If `resumeForm` can't rebuild the form (a bank question/option physically
  removed since the attempt), the review list degrades to a status note while the
  score/category breakdown above it stays intact.
  `/code-review` at high effort (8 parallel angles) found 10 findings, 6 fixed
  directly: a `#full-review-list li` CSS selector was a bare descendant selector, so
  it also matched the per-option `<li>`s nested inside each question's own list, not
  just the per-question rows — every option was rendering in its own bordered box;
  fixed by scoping to `#full-review-list > li` and sharing the rule with
  `#review-list li` rather than duplicating it. `formatElapsed` had no guard against a
  negative or unparseable timestamp span (a system clock adjusted backward mid-attempt
  — NTP correction, DST, sleep/wake — could otherwise silently show "less than a
  minute" for a multi-hour attempt); now reports "time unavailable" instead.
  `buildFullReview` had independently reimplemented the same "Map answers by id, then
  join over questions" skeleton `js/runner.js`'s `buildReviewRows` (Phase 3.1) already
  used — three review angles converged on this — so a new `joinAnswers` was extracted
  into `js/runner.js` and both functions now share it. `optionSuffix`'s four-branch
  if/else was simplified to three (the real decision tree only has three outcomes).
  The review-row DOM insertion now batches into a `DocumentFragment` instead of one
  `appendChild` per row (up to 150+ questions on the largest form). This PR's own
  Phase 4.2 status update was itself flagged as missing by the review's conventions
  angle before being added here — also caught, while updating this entry, that Phase
  4.1's merge had left the phase-overview table's Phase 4 row at ☐ instead of ◐; fixed
  both in this PR. Four findings deferred as pre-existing-class risks this diff makes
  newly visible rather than introduces, filed as GitHub issues rather than fixed
  inline: `resumeForm`'s all-or-nothing degradation (one unresolvable question hides
  the *entire* full review list, unlike `scoreAttempt`'s per-answer degradation) and
  the unenforced `attempt.answers ⊆ attempt.questionOrder` invariant the score and
  review list both implicitly rely on (related to #25); and `buildReviewRows` (S3)
  still trusting cached `answer.correct` where `buildFullReview` (S4) recomputes it,
  plus `buildFullReview`'s `isCorrectOption` ignoring `question.type` unlike
  `isCorrect` (both narrow, gated by `tools/verify.mjs`'s existing warn-only stance on
  non-`"single"` types, D-10). Live-verified in the browser: a real completed 5165
  attempt (4/5 correct, a genuine mix of right and wrong answers) rendered every
  row correctly — stem, all four options, correct/chosen markers including the
  contradictory-looking-but-correct "(correct answer)" + "(your answer — incorrect)"
  pairing on the wrong answer, explanation text, and "Time used" — and the
  `resumeForm`-returns-null fallback path was verified by deliberately corrupting a
  `questionOrder` entry: the score/category breakdown stayed intact while the review
  list correctly gave way to the status note. 34/34 relevant tests green (26 in
  `tools/test-results.mjs`, +2 `joinAnswers` cases in `tools/test-runner.mjs`),
  `verify.mjs` clean.
- ☑ **4.3 Spaced-repetition entry point.** "N questions due" on S2, driven by
  `srs.js`'s `dueAt` values.
  *Accepts:* the displayed count matches the number of questions whose `dueAt` has
  passed.
- ☑ **4.4 Weakest-category suggestion (D-18).** S2 surfaces the lowest-accuracy
  category once any category in the test has at least 5 answered questions, linking
  directly into S5 pre-filtered to that category.
  *Accepts:* a test with mixed per-category accuracy and at least one category over the
  5-question threshold shows the correct lowest-accuracy category and links into a
  pre-filtered S5 run; a test with every category under threshold shows no suggestion.

### Phase 5 — Reference materials (5165, 5485)

- ☑ **5.1 5165 formula/notation panel.** Authored content
  ([issue #3](https://github.com/homesik92/PRAXIS-Practice/issues/3), 5165's half —
  D-21) in the shared non-modal `js/reference-panel.js` component (finding #17 —
  never obscures the stem, returns focus on dismiss). 21 entries across 4 topic
  sections, 8 using real MathML.
  *Accepts:* the panel opens without covering the question stem and returns keyboard
  focus to its opening control on dismiss.
- ☑ **5.2 5165 scientific calculator (D-14).** Arithmetic (with parentheses), x^y/x²/√,
  log, ln, trig and inverse trig (degree/radian toggle), π/e constants
  ([issue #6](https://github.com/homesik92/PRAXIS-Practice/issues/6)). **No graphing.**
  Keyboard-operable, screen-reader-usable output, no color-only state.
  *Accepts:* every listed operation is reachable and operable by keyboard, and its
  output is announced to a screen reader.
- ☑ **5.3 5485 reference panel.** Periodic table (all 118 elements) + physical-
  constants panel (12 constants), same shared panel shell as 5.1.
  *Accepts:* the panel is reachable, dismissible, and keyboard-operable the same way
  5.1's is.

### Phase 6 — Hardening

- ☑ **6.1 Storage-failure handling.** Visible errors on quota-exceeded writes and
  unparseable reads, no silent reinitialization (finding #6).
  *Accepts:* a simulated quota-exceeded write and a corrupted stored value each surface
  a visible message rather than silently discarding data or reinitializing the store.
- ☑ **6.2 Progress export.** "Download my progress" (finding #9).
  *Accepts:* the exported file is valid JSON containing the full store, openable
  independently of the site.
- ☑ **6.3 Backup retention pruning.** Keep only the immediately-prior backup version
  (finding #8).
  *Accepts:* after repeated migrations, exactly one backup survives regardless of how
  many migration steps ran.
- ☑ **6.4 Full accessibility pass.** Keyboard/screen-reader pass across all five
  screens, not just the runner.
  *Accepts:* every screen — S1 through S5 — is operable by keyboard alone with a screen
  reader.

### Phase 7 — Content authoring (parallel track)

Tracked as **GitHub issues, labeled by session** (per `SKILL.md`'s triage conventions),
not as numbered sub-tasks here — batch sessions don't decompose the same way engine
phases do.

Batch sessions breadth-first per D-4/N-3: 5101 (120), 5165 (66), 5485 (125), 5652 (100)
— **411 questions**, each authored *and* answer-key-verified at high effort (SKILL.md's
model/effort guidance). The first session per test is a calibration session —
BLUEPRINT.md's F-1 sizing (~20–30 questions/session) gets checked against real
throughput and this section revised from it. 5165 and 5485 authoring is blocked on
Phase 5.1/5.3 landing (the reference content needs to exist before questions that
depend on it can be written against it) — no longer a blocker, both landed in Phase 5.

**Session-owner scope call (2026-08-18): 5165 first, to full depth, before any other
test.** Supersedes the breadth-first default above for ordering — all four tests are
still in v1 scope (D-4 unchanged), but 5165 is built to completion first rather than
interleaved with the others. Also: each test's bank is **3× its real exam length**, not
1×, so a student sees fresh questions across a first practice test, topic study, and a
second practice test — the app's existing least-recently-seen draw logic
(`drawForCategory` in `js/schema.js`, already built for spaced repetition) handles the
rotation automatically once the bank has the depth, with no code changes. For 5165 that
means **198 questions** (66 × 3), split by leaf category to match BLUEPRINT.md's real
weights ×3. Logged as D-23.

**Session-owner scope call (2026-08-18): 5101/5485/5652 authoring paused until after
launch (D-24).** Not merely "5165 first" — no content-authoring work happens on the
other three tests until the app is complete and in production (Phase 8). They stay
at 0 authored questions through the workflow/dashboard phase (new, between 7 and 8 —
see below) and launch. After launch, the session owner will return to build those
three out to the same 3×-depth standard as 5165, and possibly add tests beyond the
original four. v1 scope itself is unchanged (D-4) — this is about *when* the
remaining authoring happens, not whether it happens.

**5165 — Mathematics bank progress** (target 198, 3× BLUEPRINT.md's 66-question exam;
✓ = category complete, count is questions-with-verified-answer-key / target):

- ☑ I-A — Number and Quantity — 21/21
- ☑ I-B — Algebra — 39/39
- ☑ II-A — Functions — 39/39
- ☑ II-B — Calculus — 21/21
- ☑ III — Geometry — 39/39
- ☑ IV — Statistics & Probability — 39/39
- **Total: 198/198 — complete. Answer keys independently blind-verified (5 fresh
  subagents, one per category, given only stem+options+claimed-answer, no
  explanations or reasoning): 0 discrepancies found across all 198 questions.**

**5652 — Computer Science bank progress** (target 300, 3× BLUEPRINT.md's
100-question exam; ✓ = category complete, count is
questions-with-verified-answer-key / target):

- ☑ I-A — Impact of and Obstacles to Computing — 21/21
- ☑ I-B — Intellectual Property, Ethics, Privacy, and Security — 24/24
- ☑ II-A — Abstraction, Patterns, Decomposition, and Number Bases — 36/36
- ☑ II-B — Algorithm Analysis, Searching, and Sorting — 39/39
- ☑ III-A — Control Structures and Standard Operators — 45/45
- ☑ III-B — Procedures, Event-Driven Programs, Usability, and Data — 45/45
- ☑ IV-A — Digitalization and Encryption/Decryption — 21/21
- ☑ IV-B — Simulation, Modeling, and Data Manipulation — 24/24
- ☑ V-A — Operating Systems, Computing Systems, and Inter-Device Communication — 21/21
- ☑ V-B — Networks, Security, and the Web — 24/24
- **Total: 300/300 — complete. Answer keys independently blind-verified (5 fresh
  subagents, one per category pair, each re-deriving every answer from stem +
  options alone before comparing to the stored key): 0 discrepancies found
  across all 300 questions.**

**5101 — Business Education bank progress** (target 360, 3× BLUEPRINT.md's
120-question exam; kept the existing flat 8-category tree rather than
expanding into BLUEPRINT.md's 33 subcategories — session owner's explicit
call, given several subcategories are as small as 2 questions per real draw;
✓ = category complete, count is questions-with-verified-answer-key / target):

- ☑ I — Accounting and Finance — 54/54
- ☑ II — Communication and Career Development — 54/54
- ☑ III — Economics — 36/36
- ☑ IV — Entrepreneurship — 36/36
- ☑ V — Information Technology — 54/54
- ☑ VI — Law and International Business — 36/36
- ☑ VII — Marketing and Management — 54/54
- ☑ VIII — Professional Business Education — 36/36
- **Total: 360/360 — complete. Answer keys independently blind-verified (4
  fresh subagents, one per category pair, each re-deriving every answer from
  stem + options alone before comparing to the stored key): 0 discrepancies
  found across all 360 questions.** The same pass surfaced a systemic
  length/justification tell (the correct option conspicuously longer and/or
  the only one carrying its own built-in reasoning) — worst in Category VIII
  at 94% of questions — remediated by 5 further subagents (101 questions
  fixed total, including a full rewrite of Category VIII); see the session
  log for the fix breakdown and one genuine content bug it also caught
  (`bizlaw-024`'s two-defensible-answers ambiguity under the UCC's $500
  statute-of-frauds threshold).

**5485 — Physical Science bank progress** (target 375, 3× BLUEPRINT.md's
125-question exam; category tree expanded from 4 flat top-level categories
into BLUEPRINT.md's 9 subcategories — session owner's explicit call, the
2–3-subcategories-per-branch shape matching 5652's expanded tree rather than
5101's too-fine 33; ✓ = category complete, count is
questions-with-verified-answer-key / target):

- ☑ I-A — Nature of Science — 27/27
- ☑ I-B — Science, Engineering, Technology, Society, and the Environment — 27/27
- ☑ II-A — Atomic and Nuclear Structure and Processes — 36/36
- ☑ II-B — Relationships Between Energy and Matter — 39/39
- ☑ III-A — Chemical Composition, Bonding, and Structure — 42/42
- ☑ III-B — Chemical Reactions and Periodicity — 42/42
- ☑ III-C — Solutions and Acid-Base Chemistry — 39/39
- ☑ IV-A — Mechanics — 60/60
- ☑ IV-B — Electricity, Magnetism, and Waves — 63/63
- **Total: 375/375 — complete. Answer keys independently blind-verified (5
  fresh subagents, each re-deriving every answer from stem + options alone —
  working every calorimetry, nuclear-balancing, equation-balancing,
  stoichiometry, pH, kinematics, momentum, and circuit calculation by hand —
  before comparing to the stored key): 0 discrepancies found across all 375
  questions.** This is the first bank to populate both of a test's
  cross-cutting overlays (SCHEMA.md §2.5) at scale: `sep` (Science and
  Engineering Practice) on 260/375 = 69% against a ≥50% target, and `tot`
  (Task of Teaching Science) on 116/375 = 31% against a 25–33% target — both
  hit on the first pass, with no rebalancing needed.

All four v1 banks are now fully authored — 5165 (198), 5652 (300), 5101
(360), and 5485 (375), **1,233 questions total**, each built to D-23's
3×-depth standard and each independently blind-verified with zero
answer-key discrepancies. Feeds Phase 9.2's manifest re-enable and Phase
10's final acceptance; 5485 is still `enabled: false` in
`data/manifest.json` until it has been live-tested and deployed.

### Phase 7.1 — History-aware draw for Practice a topic / Category test

**Trigger:** live-testing feedback (2026-08-29) — the session owner noticed
seeing some 5165 Functions/Calculus questions repeat across a handful of
"Practice a topic" and "Category test" rounds, despite each category having
3× a real exam's worth of questions. Root cause, confirmed by reading
`js/schema.js`: **`assembleCategoryDrill`** (the shared draw behind both S2
modes, Phase 6.8.2/D-28) is fully random with no `history` parameter at
all — a deliberate original tradeoff (its own doc comment: "this always
draws in fully random order rather than biased by real question history...
a simpler tradeoff than threading a read-only store load through a code
path whose entire point is to prove it never touches the store"). This is
different from **`assembleForm`** (full test) and **`assembleDrill`**
("Review a topic"), which both already bias toward least-recently-seen via
`drawForCategory`. A fully-random draw from even a 39-question pool
reproduces questions within 2-3 rounds by chance — more questions reduces
that probability but never guarantees a full sweep before repeats the way
the other two modes do.

**Decision (session owner, 2026-08-29, via AskUserQuestion):** fix the draw
now rather than deferring to a follow-up issue — thread `history` through
`assembleCategoryDrill` the same way `assembleDrill` already does, so
"Practice a topic"/"Category test" also exhausts unseen questions before
repeating. This reverses the original fully-random tradeoff from Phase
6.8.2, logged as D-35.

**Scope — what changes, what doesn't:**
- `js/schema.js`: `assembleCategoryDrill` gains a `history = {}` parameter,
  passed into `drawForCategory` (currently passes `{}` unconditionally at
  line 462) — otherwise identical to `assembleDrill`'s existing pattern.
- `run.html`'s `runCategoryDrill`: reads `store.questionHistory` via
  `loadStore()` (read-only) to pass into `assembleCategoryDrill`. This is a
  **read**, not a write — the mode still never creates an attempt record,
  never calls `recordAnswer`, and never persists anything from the drill
  itself. Only the *draw* becomes history-aware; "won't be recorded or
  change your stats" (test.html's own description of this mode) stays true.
- `tools/test-schema.mjs`: the existing test asserting fully-random
  behavior ("assembleCategoryDrill ignores an unrelated history argument")
  gets replaced with a least-recently-seen assertion mirroring
  `assembleDrill`'s own coverage.
- Nothing about `assembleForm`, `assembleDrill`, or the full test/Review-a-
  topic modes changes — they were already history-aware.

**Tasks:**
- ☑ **7.1.1** `js/schema.js` — thread `history` through `assembleCategoryDrill`.
- ☑ **7.1.2** `run.html` — `runCategoryDrill` loads the store (read-only) and
  passes `questionHistory` through; update the function's header comment
  (currently documents the now-superseded "never touches the store" design).
- ☑ **7.1.3** `tools/test-schema.mjs` — replace the fully-random test with a
  least-recently-seen test; run the full suite green. (314/314 across all
  `tools/test-*.mjs`.)
- ☑ **7.1.4** Live-verify in the browser: seed some history, confirm
  "Practice a topic" now prefers unseen questions. Confirmed against the
  real `run.html` UI (not just unit tests) — seeded real `localStorage`
  history marking 37/39 Functions questions as recently seen, reloaded with
  the browser's HTTP cache explicitly bypassed (`fetch(..., {cache:
  "reload"})` primed first — the local dev server's static JS otherwise
  served a stale cached copy across reloads, a test-harness artifact, not a
  product bug), clicked Start, and the very first question shown was one of
  the two seeded-unseen questions. Test `localStorage` entry removed after.
- ☑ **7.1.5** Log D-35, index it, flag for downstream sync to
  `PRAXIS-iOS-Math` (D-30) since this touches `run.html` and `js/schema.js`.
  **Phase 7.1 complete.**

### Phase 7.2 — Supplemental authoring: 5165 Functions & Calculus

**Trigger:** same live-testing session as 7.1 — even with 7.1's fix, a
39-question Functions pool and a 21-question Calculus pool exhaust their
unseen questions quickly against the session owner's stated usage ("these
practices will be taken as many as three times"). More depth in exactly
these two categories directly addresses that, on top of 7.1's fix (the two
efforts are complementary, not alternatives — 7.1 fixes *how* questions are
selected, 7.2 grows *how many* there are to select from).

**Target:** written from scratch against the skill (never adapted from the
ETS study companion — the project's standing copyright rule), Sonnet at
high effort per SKILL.md's authoring guidance, independently blind-verified
answer keys per Phase 7's established pattern.

- ☑ **II-A — Functions**: 39 → 64 (+25). Existing coverage: evaluation,
  domain/range, composition, inverses, transformations, piecewise, even/odd,
  one-to-one, arithmetic combinations, zeros, increasing/decreasing,
  exponential growth, average rate of change. Added: deeper
  composite-function operations, rational functions (asymptotes/behavior),
  absolute value functions, more piecewise reasoning.
- ☑ **II-B — Calculus**: 21 → 51 (+30). Existing coverage: power/product/
  chain/quotient rules, trig/exponential/log derivatives, critical points,
  max/min, integrals (power rule, constants, definite), velocity/position,
  limits. Added: implicit differentiation, related rates,
  concavity/inflection points, integration by substitution (conceptual),
  area under curves, optimization word problems.
- ☑ Answer-key verification: two blind subagents (one per category) re-derived
  every answer from stem + options alone before seeing the stored key.
  **0 key discrepancies across all 55** — the fourth consecutive bank with a
  clean key set. 18 non-key defects found and fixed; see the session-log entry
  for the full list. `bankSize` in `data/manifest.json` updated 198 → 253.
- ☑ `node tools/verify.mjs` clean (category counts still sum correctly —
  category *counts* in the tree are exam-form targets, unaffected by pool
  depth; this only grows the pool `assembleForm`/`assembleDrill`/
  `assembleCategoryDrill` draw from). 7/7 test suites green.
- ☑ Flag for downstream sync to `PRAXIS-iOS-Math` (D-30) — `data/tests/5165.json`
  and `data/manifest.json` are both bundled files there. **Flagged in the PR
  description; not yet synced.**
- ☐ **Deferred, own PR:** the pre-existing 198 questions are 183/198 (92%)
  keyed `"a"` with zero `"d"` answers — a raw-JSON exposure only, since
  `shuffleQuestionOptions` randomises every assembly path, but 5165 is the
  only bank with it (5652 36%, 5101 27%, 5485 25%). Tracked as
  [issue #93](https://github.com/homesik92/PRAXIS-Practice/issues/93): it
  rewrites already-live content and needs its own iOS sync and redeploy, so
  it does not belong in this PR.

  **Phase 7.2 complete.**

### Phase 6.5 — Workflow & progress dashboard

- ☑ **6.5.1 Cross-attempt aggregation helpers.** `js/store.js` gained
  `findFirstAndLatestAttempts(store, testCode)` (earliest/latest *completed*
  attempt, relying on `store.attempts`' guaranteed append-order rather than
  parsing timestamps). `js/schema.js` gained `aggregateCategoryStats(bank,
  history)` (every leaf category with any history, not just the single worst —
  `weakestCategory`'s own aggregation loop was extracted into a shared private
  `aggregateHistoryByCategory` helper both functions now call, closing a
  duplication rather than copy-pasting the loop a second time). `js/results.js`
  gained `categoriesNeedingPractice(summary, threshold=1)` (this *attempt's* own
  categories with more than one missed question — deliberately attempt-scoped,
  a different question from the cross-attempt/all-time functions above).
- ☑ **6.5.2 Progress dashboard (S6).** New `dashboard.html`: first-vs-latest
  completed-attempt score comparison (or a single-attempt message when only one
  exists) plus an all-time per-category breakdown (accuracy once a category
  clears the existing 5-distinct-question eligibility threshold, "not enough
  data yet" below it) via `aggregateCategoryStats`.
- ☑ **6.5.3 Entry points.** `test.html` (S2) shows a "View progress dashboard"
  link once at least one completed attempt exists. `results.html` (S4) shows a
  new "Practice your weak spots" section linking each under-practiced category
  straight into S5's existing single-category drill.
- ☑ **6.5.4 Manifest simplification.** Per the session owner's design
  simplification (2026-08-18): this app now runs one subject at a time — 5165
  stays `enabled: true` in `data/manifest.json`, 5101/5485/5652 flipped to
  `enabled: false` (config-only, no code changed; a future subject swap is
  another one-line manifest edit, not a refactor). `index.html`'s copy no
  longer hardcodes "four."
- ☑ **6.5.5 Code review + remediation.** 8-angle `/code-review` at high effort
  found 9 findings; 2 CONFIRMED correctness issues fixed (see session log for
  the fix). Remaining findings are minor cleanup (CSS rule duplication, a
  couple of duplicated magic numbers/formulas, a wasted computation, one
  redundant branch) — left as-is, tracked in the session log rather than as
  GitHub issues since each is a one-line-scope, easily-rediscoverable
  nice-to-have, not a real risk.

### Phase 6.6 — Progress dashboard visual redesign

Session owner asked for the dashboard specifically to move from plain
lists/text to "something professional and colorful" — reviewed as an
Artifact mockup first (multiple bar-style options compared), approved, then
built into the real `dashboard.html`.

- ☑ **6.6.1 Visual redesign, wired to real data.** The attempt comparison is
  now two circular meters (one hue, two shades — light for "first," full
  accent for "latest") with a delta indicator between them, replacing the
  plain "First attempt: X% — Latest attempt: Y%." sentence; a single meter
  for the one-attempt case. The category breakdown is now a bullet graph per
  category (qualitative Strong/Building/Needs-practice bands, a tick at the
  75% "Strong" threshold, a status chip with icon + text — never color
  alone, matching this site's existing convention) rather than a bare list.
  Deliberately light-only, no dark-mode variant — matches every other screen
  in this app (`html { color-scheme: light; }`, no media query anywhere in
  the codebase); reuses the site's existing `--color-accent`/
  `--color-correct`/`--color-incorrect` tokens rather than a parallel
  palette, only adding a "building" amber and the neutral bar-track grays.
  Two small pre-existing findings closed as part of the same touch:
  `percentOf` (js/results.js) is now exported and reused by `dashboard.html`
  and `test.html` instead of three independent inline copies of the same
  rounding formula; `dashboard.html`'s category-label lookup now uses
  `flattenCategoryLabels` (already used by `results.html`) instead of its
  own hand-rolled `flattenCategoryTree` + `Map` construction.
- ☐ **6.6.2 Category test — superseded, folded into Phase 6.8.** The
  redesign's "Start another test" section previews a second path next to the
  existing full practice test: a category test, 10 questions from one
  category, same test-taking experience, but explicitly **not recorded** —
  no attempt created, no effect on the stats above (it must write nothing to
  `questionHistory` either, not just skip creating an `attempt`, or "not
  recorded" would be only half true). Originally deferred as its own later
  plan (session owner's call, 2026-08-18); **session owner's call
  (2026-08-20): fold this into the Phase 6.8 S2 redesign** rather than build
  it standalone against the plain-link S2, since 6.8 is rebuilding S2's
  entry-point surface anyway. The control still ships today as a real,
  populated but `disabled`/`aria-disabled` dropdown and button with a
  "Coming soon" badge on `dashboard.html` — untouched until 6.8 lands.

### Phase 6.7 — Restore progress ("upload progress")

Pairs with Phase 6.2's export. D-26: replaces the whole store, never merges —
cross-device merge is a separate, harder problem, explicitly deferred.

- ☑ **6.7.1 Restore flow, end to end.** `js/store.js` gained
  `importStoreFromJson(jsonText)` (parses/validates/migrates an uploaded file
  through the same shape checks `loadStore` applies to `localStorage`, but
  never touches storage itself) and `summarizeStore(store)` (attempt count +
  distinct-questions-with-history count, shared by both halves of the restore
  confirmation). `test.html` gained an "Upload progress" file input next to
  "Download my progress": on file select, shows a per-reason error message or
  opens a native `<dialog>` (matching Phase 3.2's confirm-submit precedent)
  summarizing both what's currently saved (about to be lost) and what the
  uploaded file contains, before `saveStore` + reload on confirm.
  `/code-review` at high effort (8 parallel angles) found 10 findings, 9
  fixed, 1 deliberately skipped (see below). Most severe: `importStoreFromJson`
  only validated `storeVersion`, not that `attempts`/`questionHistory` were
  the right shape — a malformed-but-version-valid uploaded file could crash
  `run.html`/`dashboard.html`/`test.html` on the next load; fixed by
  tightening the shared `parseStoredValue` check (also hardens `loadStore`
  against the same class of corrupted `localStorage` value). Second: the
  confirmation dialog's summary was a stale snapshot from file-select time,
  never re-checked before the actual write — another tab could save new
  progress while the dialog sat open, silently discarding it without that
  ever being reflected in what was confirmed; fixed by re-checking the exact
  raw stored value (not the rendered summary text, which two different stores
  can coincidentally match) immediately before the write, re-prompting if it
  changed. Also fixed: no try/catch around the async file-read (an unhandled
  rejection could leave the user with zero feedback on a failed read); no
  re-entrancy guard on the file input during the async gap; a stale code
  comment misdescribing which `try`/`catch` covers migration errors after the
  Phase 6.7 extraction; a new "NaN storeVersion" test that didn't actually
  test NaN (`JSON.stringify` serializes `NaN` to `null`, and real JSON has no
  NaN token at all, so a JSON-text-based API can never receive literal `NaN`
  — reworded to describe what it actually covers). One finding deliberately
  skipped: extracting a shared dialog-wiring helper between this new dialog
  and `run.html`'s existing confirm-submit dialog (real duplication, matches
  this project's own precedent for extracting a pattern once it repeats) —
  skipped because it would mean touching and re-testing a different,
  already-shipped page for a cleanup-category finding, more risk than this
  PR should take on; left as a candidate for a future pass if a third
  occurrence ever appears. 63/63 `tools/test-store.mjs` tests green (14 new:
  7 for `importStoreFromJson` itself, 2 for `summarizeStore`, 2 for the new
  shape-validation cases, 1 reworded, plus regression coverage), 282/282
  across the full suite, `verify.mjs` clean. Live-verified in the browser
  (fresh port each round per this project's stale-module-cache landmine,
  driven entirely via `javascript_exec` with real `File`/`DataTransfer`
  objects, never `computer` clicks, per the stray-click landmine): the happy
  path (import correctly replaces the current store), Cancel, both error
  messages, the Escape/focus-return path, and — critically — the fixed
  stale-summary race itself, reproduced directly (seeded a same-shaped-but-
  different "current" store while the dialog sat open, confirmed the first
  Confirm click correctly detected the change via the raw-value comparison
  and blocked the save, and the second click then proceeded correctly) and
  the try/catch fix (monkey-patched `File.prototype.text` to reject, confirmed
  a clear message and no unhandled rejection). Zero console errors throughout.

### Phase 6.8 — S2 redesign (test-menu hub)

Session owner asked for S2 (`test.html`) to move from a bare list of
conditional text links to something closer to a real GUI, and specifically to
echo `dashboard.html`'s own visual language (Phase 6.6's meters/bullet-graph
style) rather than a separate idiom — including showing the dashboard itself,
zeroed/empty-state, so a first-time visitor can see where their data will
eventually show up. Folds in 6.6.2's deferred category-test mode (session
owner's call, 2026-08-20) rather than building it against the old S2 later.

- ☑ **6.8.1 Mockup, iterate to sign-off.** First pass published as an Artifact
  2026-08-19: a card-based hub. Session owner's feedback (2026-08-20): rework
  toward `dashboard.html`'s own component language, merge S2's entry actions
  with a live-or-zeroed dashboard view. Second pass (2026-08-20) rebuilt on
  that direction — meters/category-bars reused directly from `dashboard.html`,
  a zero-filled category list on first visit (every leaf category shown
  `pending`, not just ones with history), a "Continue" callout wrapping
  resume/due/weakest, backup/restore in a collapsed `<details>`. **Signed off.**
  While reviewing the mockup, the Start-menu scope itself grew — see 6.8.2's
  final shape below, settled via two rounds of AskUserQuestion (2026-08-20).
- ☑ **6.8.2 Build and wire up.** Scope, as settled 2026-08-20 — the Start
  section ends up with **five** entries, not the two the mockup showed:
  1. **Full practice test** — existing, unchanged.
  2. **Practice a topic** (new) — untimed, 10 questions from one category,
     same flag/review-pass/submit flow as a real test, scored locally,
     never persisted.
  3. **Category test** (new) — identical to #2 but timed, matching a real
     test's clock. Shares one new engine mode with #2 (a timer on/off flag),
     not two separate builds.
  4. **Study a topic** (new *label*, new *destination*) — a short,
     textbook-chapter-style teaching page for the category (explanation of
     how to work its problems, not a quiz). **Ships as a `disabled`/"Coming
     soon" stub in this phase** — the real content is its own new phase, see
     Phase 6.9 below (session owner's call, via AskUserQuestion).
  5. **Review a topic** — today's existing S5 immediate-reveal drill (pick a
     category, answer one at a time, see the explanation right away, work
     the whole pool), kept exactly as-is (session owner's call, via
     AskUserQuestion: don't retire or fold it into anything). Relabeled from
     its current "Study a topic" text to avoid colliding with #4's new
     destination — same `run.html` mode/URL, display copy only.

  Two PRs, split by risk (dev-workflow's "propose splitting when scope
  grows mid-session"):
  - ☑ **PR A — page merge (moderate, self-reviewed).** `dashboard.html`'s
    rendering (meters, category bars, legend) folded directly into
    `test.html`; `dashboard.html` deleted (confirmed by grep before starting:
    nothing else linked to it directly — `index.html`/`run.html`/
    `results.html` all already link to `test.html?code=...`). Category list
    is zero-filled from the bank's own question set (`categoryId`s that
    appear in `bank.questions`, matched in tree order via
    `flattenCategoryTree`, no `schema.js` change needed) — every leaf a real
    question attaches to now shows a `pending`/"0 of 5 answered" row before
    any history exists for it, not just the ones already touched. The
    résumé/due/weakest-category entry points (previously bare sibling links)
    are now one grouped "Pick up where you left off" callout. #2–#4 render
    as real, populated (not just "Coming soon" text) `disabled` stubs — the
    category-test/practice-topic pickers are pre-filled with this bank's
    actual categories, same honest-preview pattern 6.6.2 established. #1 and
    #5 (relabeled from "Study a topic" to "Review a topic") work for real,
    same underlying `run.html` links as before. No persisted-data shape
    change; no `js/store.js`/`js/schema.js` function signatures touched
    (`allCategoryStats`, the only new logic, lives in `test.html` itself).
    **One real bug caught live-testing, fixed before shipping:** the new
    `.continue-callout { display: flex; }` CSS rule overrode the browser's
    own `[hidden] { display: none }` default (an author-stylesheet `display`
    declaration always wins over the UA stylesheet regardless of source
    order) — the empty callout rendered even on a fresh, zero-attempt store
    with `hidden` correctly set by the script. Fixed with an explicit
    `.continue-callout[hidden] { display: none; }` override; the app has no
    other case where a `hidden`-toggled element's own class sets `display`,
    so this pattern isn't repeated elsewhere in `css/base.css` today.
    284/284 tests green (no test file changes — this PR touches only
    `test.html`/`css/base.css`/a stale comment in `js/schema.js`),
    `verify.mjs` clean. Live-verified in the browser (plain `python3 -m
    http.server`, `localStorage.clear()` for the zero-state, then a
    hand-constructed store — two completed attempts, 60 questions'
    `questionHistory`, one in-progress attempt — written directly to
    `localStorage` for the populated state, matching this project's
    established hand-edited-storage testing technique): zero-state shows
    "Not started" on the meter and all six leaf categories pending with no
    callout at all; the populated state correctly shows all three callout
    entries (resume, weakest-category — due didn't trigger since seeded
    `dueAt` values were in the future, expected), both meters with the
    correct delta, and a realistic mixed category breakdown (some
    `Building`, some still pending); "Download progress" produced a real
    blob URL with the correct filename; "Upload progress" opened the
    confirm dialog with an accurate current-vs-incoming summary and Cancel
    correctly left storage untouched. Zero console errors from real app
    code throughout (the browser tool's own console-log buffer persisted
    stale errors from an earlier test-script bug of mine across
    reloads/navigations — traced and ruled out, not an app issue).
  - ☑ **PR B — the shared practice/category-test mode (deep, full 8-angle
    review).** New pure `assembleCategoryDrill(bank, categoryId, {count, random})`
    in `js/schema.js` and a new `run.html` `mode=drill` covering both #2
    (untimed) and #3 (`&timed=1`) — 10 questions, one category, same
    flag/skip/review-pass/confirm-submit UI as a real test, scored locally.
    Deliberately never imports/calls any of `js/store.js`'s mutating exports
    — "never touches the store" is true by construction (a local `answers`
    array), not by carefully avoiding certain calls. `test.html`'s two
    disabled stubs enabled for real. 293/293 tests green (9 new),
    `verify.mjs` clean. 8-angle `/code-review` at high effort found 5
    findings, all fixed: a real bug (Angle A) — the drill's `finish()` never
    closed `#confirm-submit-dialog` before revealing the completion screen
    (harmless in the real S3 flow, whose `finish()` always navigates away
    via `location.href` instead, discarding the dialog with the page), so a
    Category Test's clock expiring while the confirm-submit dialog was open
    left a stale modal stacked on the already-scored completion screen —
    fixed by closing the dialog first if open; ~130-150 lines duplicated
    between `beginRun` and the new `runCategoryDrill`, converging from 3
    angles, extracted into three shared `run.html`-level helpers:
    `tickCountdown` (the timer/threshold-announce body), `renderReviewListInto`
    (the review-row-building loop), and `buildConfirmSubmitMessage`/
    `wireConfirmSubmitDialog` (the count message + Cancel/close/Confirm
    wiring) — `showReviewScreen`/`renderQuestionForEdit`/`reopenQuestion` left
    as-is per the review's own note that they're genuinely more different
    (no SRS-baseline/`priorHistory` to preserve in the drill); dead
    `questionShownAt` in `runCategoryDrill` (assigned, never read) deleted;
    `test.html`'s two picker-wiring blocks (only the `timed` flag differing)
    consolidated into one `wireDrillPicker(select, link, timed)` helper.
    Live-tested in the browser: full untimed run (flag+skip, reopen +
    live-edit + change answer, confirm-submit counts, completion), full timed
    run forced to expire via a `Date.now` monkey-patch specifically while the
    confirm-submit dialog was open (the fixed bug's exact repro — confirmed
    the dialog closes and the completion screen renders cleanly), both
    category-not-found error paths, and a full regression pass of the real
    S3 timed test (extraction didn't change its behavior). `localStorage`
    confirmed byte-for-byte untouched (`null`) through every drill path,
    zero console errors throughout, zero stray real clicks (verified via a
    `document.addEventListener('click', ..., true)` capture).
  *Accepts:* PR A — S2 matches the signed-off mockup with real data in every
  state (first-visit zeroed, resume/due/weakest present, populated
  dashboard); #2–#4 visibly present but inert. **PR A done, live-verified.**
  PR B — a practice/category test of either kind completes and scores
  without creating an `attempt` or writing `questionHistory`, confirmed by
  inspecting the store directly before and after. **Done, live-verified.**

### Phase 6.9 — Topic teaching pages ("Study a topic")

New, split off from 6.8.2's Start-menu scope (session owner's call, via
AskUserQuestion, 2026-08-20): a short, textbook-chapter-style page per
category explaining how to work its problems — worked examples and
explanation, not a quiz. Content-authoring-heavy, closer in kind to Phase
5's reference panels or Phase 7's question banks than to a UI task; deserves
its own design pass (content schema, page shape, how deep "a couple of
pages" of teaching per category actually runs) before any authoring starts —
design pass done, see 6.9.1 below. Same standing rule applies as everywhere else in this
project: written from scratch against the underlying skill, never adapted
from the gitignored ETS study-companion PDFs — arguably an even sharper risk
here than for quiz questions, since teaching prose is closer in *kind* to
what a study guide's own prose looks like.

- ☑ **6.9.1 Design pass — settled (D-29).** Content schema: `data/teaching/<code>.json`
  reuses SCHEMA.md §2.9's reference-panel `sections`/`entries`/`{format, value}` shape
  verbatim, adding one field — a per-section `categoryId` (a leaf id from the bank's own
  category tree) so a chapter can be selected on its own rather than shown as one
  continuous document. Page shape: a new standalone page, `teach.html?code=<code>&
  category=<id>`, not a `run.html` mode — no timer, no scoring, no `questionHistory`
  write. Rendering reuses `js/reference-panel.js`'s `renderContent`/`renderReferencePanel`
  unchanged (no new render code); `teach.html` filters to the requested category's
  descendant chapters via the existing `categoryAndDescendantIds`, same convention S5's
  drill picker already uses. New `teachingContent` bank field (parallel to
  `referencePanel`), `js/schema.js`'s `loadTeachingContent`, and `tools/verify.mjs`'s
  `leafCategoryIds`/`validateTeachingContent` (existence, JSON validity, shape reused
  from `validateReferencePanel`, plus a `categoryId`-resolves-to-a-real-leaf-category
  cross-check) all follow the referencePanel precedent. Proved against one real authored
  chapter (5165's "Number and Quantity," `data/teaching/5165.json` — concept overview,
  a worked example, common mistakes, exercising both `text` and `mathml` content).
  301/301 tests green (5 new in each of `test-schema.mjs`/`test-verify.mjs`),
  `verify.mjs` clean. Live-tested in the browser: the authored chapter renders correctly
  (prose and MathML — fractions, radicals, ℤ — all display properly), both
  category-not-found and no-lesson-yet-authored paths, a test with no `teachingContent`
  field at all, missing code/category params, zero console errors throughout. 8-angle
  `/code-review` at high effort found 4 real findings, all fixed: a `continue` inside
  the referencePanel content-validation branch of `tools/verify.mjs`'s per-bank loop
  jumped past the entire rest of that iteration, silently skipping teachingContent
  validation for the same bank whenever the reference panel's JSON failed to parse —
  fixed by extracting a shared `validateAndReportContentFile` helper that `return`s
  from its own scope instead of `continue`-ing the caller's loop (this also closed a
  ~14-line copy-paste the reuse/simplification angles flagged between the
  referencePanel and teachingContent validation blocks); `teach.html`'s categoryId
  filter used an exact match against `contentResult.content.sections`, so picking a
  *branch* category (e.g. top-level "I") would show "no lesson" even when its child
  leaves ("I-A"/"I-B") both have authored chapters — fixed to use
  `categoryAndDescendantIds`, matching how every other "pick a category" entry point
  in this codebase already works; `teach.html` had no guard on
  `contentResult.content.sections` before calling `.filter()` on it — an uncaught
  `TypeError` on a malformed/not-yet-`verify.mjs`-checked content file, unlike every
  sibling failure path in the same function — fixed with an `Array.isArray` check
  folded into the existing `!contentResult.ok` branch; this ROADMAP.md entry itself
  wasn't flipped to ☑ in the same pass D-29 settled the design (conventions-angle
  finding, self-referential — fixed by writing this entry). Two forward-looking
  findings deliberately left as documentation rather than code changes, since nothing
  in the current 5165 tree exercises them yet: `leafCategoryIds` only accepts
  weight-bearing leaves, stricter than `flattenCategoryTree`'s any-node lookup —
  relevant only if a future `weight: null` "study filter" category (SCHEMA.md §2.4)
  ever gets its own chapter, which none does today; and `teachingContent` is one file
  per bank covering every chapter (following `referencePanel`'s own precedent), which
  means Phase 6.9.2 authoring all 6 Mathematics chapters into that one file will make
  every single-chapter page load fetch (and discard) the other five chapters' content
  — worth reconsidering (e.g. one file per chapter) before or during 6.9.2 if that
  file grows large enough to matter, but not a problem yet at one chapter's size.
- ☑ **6.9.2 Author Mathematics' 6 chapters — done, all 6 authored.** I-A shipped
  with 6.9.1; the remaining 5 (I-B Algebra, II-A Functions, II-B Calculus, III
  Geometry, IV Statistics & Probability) drafted this pass, same 3-section shape
  as I-A (concept overview, one worked example, common mistakes), written from
  scratch against general math-teaching knowledge per the ETS copyright rule —
  never adapted from the gitignored Study Companion PDFs. Drafted via 5 parallel
  agents (one per chapter) to move faster on content-authoring-heavy work, each
  independently id-prefixed (`algebra-`/`functions-`/`calculus-`/`geometry-`/
  `statistics-`) to avoid collisions when merged into the single
  `data/teaching/5165.json` file — confirmed zero id collisions across all 6
  chapters (14 pre-existing + 83 newly added ids, all unique) before merging.
  No schema or code changes needed; 301/301 tests still green, `verify.mjs`
  clean. **A dedicated independent-verification pass (content is this project's
  real correctness surface, not code) redid every worked example's arithmetic
  from scratch and structurally checked all 29 new MathML blocks** — found one
  real bug: II-A's "transformations of a parent function" entry stated the
  wrong order for combining a horizontal shift and horizontal stretch/reflection
  (claimed shift-then-stretch; for the form `y = a·f(b(x-h)) + k`, since
  `b(x-h) = bx - bh`, the stretch must apply before the shift or the result is a
  different function — proven by counterexample and confirmed independently).
  Fixed directly in the content. No other mathematical, MathML-structural, or
  copyright/originality issues found across any of the 5 chapters. Live-tested
  all 5 in the browser plus the pre-existing branch-category aggregation (a
  parent category like "I" now correctly renders both its child chapters, I-A
  and I-B, together) — MathML confirmed rendering as actual math (fractions,
  exponents) via screenshot, not just text, zero console errors throughout.
- ☑ **6.9.3 Wire up the Start-menu control — done.** Replaced the `disabled`
  "Coming soon" stub with a real category picker (`<select>` + "Open →"
  link), matching Practice-a-topic/Category-test's existing picker pattern
  exactly rather than inventing a new UI. Generalized the previously
  drill-only `wireDrillPicker` helper into `wireCategoryPicker(select, link,
  hrefFn)`, now shared by all three pickers. Links to
  `teach.html?code=<code>&category=<selected>`. Removed the now-dead
  `.coming-soon-badge` CSS rule (its only usage). Live-tested locally: both
  a leaf category (Algebra) and a branch category (Number & Quantity and
  Algebra, aggregating its two children) render real teaching content
  through the new link, zero console errors.

### Phase 6.10 — Topic teaching pages, remaining three subjects

Phase 6.9 built the teaching-page *system* and authored Mathematics' chapters.
It did not author anyone else's, and nothing else in this roadmap ever picked
that up — **6.9.2 is titled "Author Mathematics' 6 chapters" and was
Mathematics-only by design**, while **6.9.3 wired a *generic* Start-menu
control** (`wireCategoryPicker`, shared by all three pickers) that works for
every registered test. So the UI shipped for four subjects while the content
shipped for one, and Phase 7 covered question banks only — never teaching
chapters. This phase is the missing successor to 6.9.2 (D-32).

**The observable symptom**, which is what surfaced the gap: picking any topic
under Computer Science, Physical Science, or Business Education loads
`teach.html` and renders `No lesson has been written for "…" yet.` — the
`!bank.teachingContent` branch, since only `data/tests/5165.json` carries a
`teachingContent` key today.

**Shape follows 6.9.2's precedent exactly** — three sections per chapter
(concept overview, one worked example, common mistakes), authored into a single
`data/teaching/<code>.json` per bank. **One file per bank is confirmed, not
merely inherited** (D-32): 6.9.1 flagged that this makes every single-chapter
page load fetch and discard the other chapters, and that landmine was re-examined
here rather than left implicit — 5165's 6 chapters are 53K, so 5652's 10 project
to roughly 90K, still one fetch on a local-network-only NAS. Revisit if a bank's
file ever grows past that materially; splitting would change the schema and
`verify.mjs`'s `validateTeachingContent`, turning data-only work into a deep change.

⚠ **The ETS copyright rule is sharper here than for quiz questions**, and 6.9's
own framing already said so: teaching prose is closer *in kind* to what a study
companion's prose looks like, so the risk of drifting into paraphrase is higher
than when writing a multiple-choice item. Every chapter is written from scratch
against the underlying skill, never adapted from the gitignored PDFs.

Each sub-task's *Accepts* is the same, and matches what 6.9.2 actually did:
every leaf category authored; the `teachingContent` key added to the bank;
`node tools/verify.mjs` clean (its `validateTeachingContent` cross-checks that
each section's `categoryId` resolves to a real weight-bearing leaf); an
**independent content-verification pass** that re-derives every worked example
from scratch rather than reading the authored explanation — the pass that caught
6.9.2's genuinely wrong function-transformation ordering, and the only gate that
can catch a subject-matter error here; and every chapter live-tested in the
browser, including the branch-category aggregation case (picking a parent
category renders all its descendant leaves' chapters).

These are content-authoring sessions, closer in kind to Phase 7 than to a UI
task — high effort, one subject per session, each with its own plan gate.

- ☑ **6.10.1 Computer Science (5652) — 10 chapters, done.** I-A Impact of and
  Obstacles to Computing · I-B Intellectual Property, Ethics, Privacy, and
  Security · II-A Abstraction, Patterns, Decomposition, and Number Bases ·
  II-B Algorithm Analysis, Searching, and Sorting · III-A Control Structures
  and Standard Operators · III-B Procedures, Event-Driven Programs, Usability,
  and Data · IV-A Digitalization and Encryption/Decryption · IV-B Simulation,
  Modeling, and Data Manipulation · V-A Operating Systems, Computing Systems,
  and Inter-Device Communication · V-B Networks, Security, and the Web.
  Chapters needing traced code use `format: "code"`, rendering via
  `js/reference-panel.js`'s existing `renderContent` dispatch — no new code,
  matching 6.9's precedent. Authored via 10 parallel per-category subagents
  (high effort), each producing the same 3-section shape as 5165's chapters
  (concept overview, worked example, common mistakes); zero id collisions on
  merge into `data/teaching/5652.json` (30 sections, 136 entries).
  **Independent verification, 5 subagents (one per category pair), each
  re-deriving worked-example arithmetic/traces from scratch before comparing**
  — the standard this project holds for content correctness. Found and fixed
  18 real defects before merge: an off-by-one counterfactual stated twice in
  III-A's loop trace (claimed `<` would end the loop "one pass earlier" than
  `<=`; actually two, since the intervening pass left `total` unchanged); a
  `double`-vs-`int` mismatch in II-A's pseudocode where the declared type
  contradicted its own "real division" comment, invisible in the chosen trace
  data because all three category averages happened to divide evenly; an
  internal contradiction in I-A's worked example (a district described as
  "suburban and rural" whose analysis depends on an urban school); a sentence
  in the same example that read as contradicting its own conclusion; an
  overstated FERPA claim in I-B implying the law constrains an individual
  student's side project rather than the school itself; an unhedged "the
  strongest factors" ranking that omitted educational attainment, one of the
  strongest documented predictors; a satellite-connectivity characterization
  dated with respect to LEO service; a copyright claim that identifiers fall
  outside "the expression" (they don't — the actual reason renaming a copy
  doesn't launder it is that a modified copy is still a derivative work); a
  missing IP-header/TCP-header distinction in V-B (sequence numbers live in
  TCP, not IP, self-contradicted two sentences later in the same entry); an
  incomplete firewall-visibility claim in V-B omitting that TLS's SNI field is
  sent in cleartext, which is how school content filters actually block by
  domain; V-A's page-load trace attributing DNS resolution to the OS kernel,
  contradicting V-B's own browser-does-it account; an understated RAM-to-
  storage speed gap (three-plus orders of magnitude, stated as one); an
  overgeneralized "arrays and records pass a reference" claim in III-B, true
  for arrays but false for C/Pascal-style value-type records/structs (fixed
  in both its occurrences); and a same-chapter tension between "firewalls
  don't examine file content" and "firewalls filter on... sometimes
  application content." Verified fully correct with no changes: all Caesar
  cipher arithmetic (IV-A), the full compound-growth simulation (IV-B), the
  selection-sort trace (II-B), the ACM Code of Ethics citations and FERPA/
  COPPA thresholds (I-B), and every TLS/HTTPS security claim (V-B) — flagged
  by its own verifier as "unusually well-calibrated," better than typical
  study material. `node tools/verify.mjs` clean throughout; 312/312 tests
  green (unchanged — data-only). Live-tested in the browser: the exact
  scenario that surfaced this gap (5652's "Networks, Security, and the Web")
  now renders the corrected content with zero console errors; the branch-
  aggregation case (parent category "III") correctly renders both III-A and
  III-B chapters together; II-A's number-base-conversion MathML renders as
  real typeset math (division symbols, subscripts, superscripts — confirmed
  visually, not just DOM-checked); 5485/5101 categories still correctly show
  "No lesson has been written... yet" pending 6.10.2/6.10.3.
- ☐ **6.10.2 Physical Science (5485) — 9 chapters.** I-A Nature of Science ·
  I-B Science, Engineering, Technology, Society, and the Environment · II-A
  Atomic and Nuclear Structure and Processes · II-B Relationships Between
  Energy and Matter · III-A Chemical Composition, Bonding, and Structure ·
  III-B Chemical Reactions and Periodicity · III-C Solutions and Acid-Base
  Chemistry · IV-A Mechanics · IV-B Electricity, Magnetism, and Waves.
  Note: worked examples here are calculation-heavy (stoichiometry, calorimetry,
  half-life, kinematics, circuits) — the independent verification pass matters
  most on this subject, and `mathml` content is available for formula display,
  already proven by 5165's chapters.
- ☐ **6.10.3 Business Education (5101) — 8 chapters.** I Accounting and Finance ·
  II Communication and Career Development · III Economics · IV Entrepreneurship ·
  V Information Technology · VI Law and International Business · VII Marketing
  and Management · VIII Professional Business Education.
  Note: this bank's categories are flat top-level leaves (no subcategories —
  the session owner's call during 5101's question authoring), so its 8 chapters
  each cover a broader span than 5652's or 5485's subdivided ones.

### Phase 6.11 — Landing page visual refresh

Visual improvement to `index.html` and `css/base.css` — kept all existing content
and functionality, added visual polish and imagery to make the landing page more
engaging.

**Ran as one continuous interactive session, not the three separable steps originally
planned below** (requirements → asset sourcing → implementation): the ideation
questions, the illustration/mark build, and the live-reviewed iteration all happened
in sequence with no external-asset handoff, since nothing ended up sourced — see D-34.
The sub-task numbers are kept as a record of what was planned; their bodies now
describe what actually shipped.

- ☑ **6.11.1 Requirements & design ideation.** *Complete.* Direction gathered via
  AskUserQuestion rather than a separate interview session: welcoming/approachable
  mood, illustrated/vector imagery (not photographic), a subtle personal accent for
  the session owner (Naval Academy alum) rather than a literal "Bill the Goat" mascot
  placement, and the existing results/dashboard color palette carried onto S1 for
  visual continuity.
- ☑ **6.11.2 Asset sourcing & graphics proposal.** *Complete — no external sourcing.*
  Every visual is hand-authored inline SVG built directly in this session (D-34), not
  sourced or commissioned imagery: a classroom hero illustration (teacher at a
  whiteboard, two seated students, colored from the existing site palette), and a
  masthead mark whose final form went through real iteration — a drawn "Bill the
  Goat" silhouette, then the real USNA athletics mark, then a fouled anchor, settling
  on "Go Navy, Beat Army!" as plain colored SVG text (D-33 has the full reasoning for
  each step).
- ☑ **6.11.3 Implementation.** *Complete.* `index.html`/`css/base.css` updated with
  the masthead mark, hero illustration, and a two-line serif motto block
  ("The secret to passing PRAXIS…" + 3 points), all scoped to new S1-only classes —
  no existing markup, JS, or data files touched. A real bug was found and fixed along
  the way: an inline SVG sized by CSS `width` alone (no `height` attribute, no
  `aspect-ratio`) doesn't reliably derive its height from `viewBox`, and was silently
  cropping the mark to its top ~30% — fixed with an explicit `aspect-ratio`, applied
  to both new SVGs. `node tools/verify.mjs` green throughout (unaffected — no data/
  schema files touched); every design iteration was live-tested by the session owner
  via hard-refreshes of the local dev server, using Claude-published preview
  artifacts as an intermediate visual-review step given a broken in-session browser
  pane. Shallow change per Gate 3 (pure CSS/HTML, no code-review round run); merged
  via [PR #88](https://github.com/homesik92/PRAXIS-Practice/pull/88). iPhone/native-
  wrapper fit deliberately deferred — filed as
  [issue #87](https://github.com/homesik92/PRAXIS-Practice/issues/87).

### Phase 8 — Launch (NAS)

Per SKILL.md's trimmed launch-and-cutover guidance (staged exposure and canary
percentages don't apply at this scale; the two retained disciplines are the rollback
plan and the progress-store's expand/contract migration safety, already built in
Phase 0.2).

- ☑ **8.1 NAS hosting mechanism — resolved 2026-08-19.** Session owner's Synology
  NAS ("PhiloMcGiffin", local network only, no external exposure), served via **Web
  Station** (not Container Manager, not a plain file share — a plain share was tried
  first and rejected once it came up that `fetch()` for `data/manifest.json`/question
  banks doesn't work under `file://`, only `http(s)`). File transfer is SSH, driven
  directly from a Claude session, using a dedicated low-privilege deploy account
  (`praxis-deploy`) rather than the admin login.
- ◐ **8.2 First deploy — done, but short of this task's own Accepts criteria.**
  Copied the built static tree (`index.html`, `run.html`, `results.html`, `test.html`,
  `dashboard.html`, `css/`, `js/`, `data/`) to `/volume1/praxis-practice` via a plain
  `tar | ssh ... tar x` pipe (rsync/scp/sftp all turned out to be blocked on this NAS
  — see the session owner's NAS reference notes, not duplicated here). Site is live at
  `http://10.0.0.37:8080/`; confirmed the homepage and `data/manifest.json` both serve
  correctly (the actual `file://`-vs-`http` fix 8.1 exists for). **Not yet done, still
  open:** a full timed attempt hasn't been live-tested start-to-score served from the
  NAS (only static/data serving was verified, not the runner/scoring/persistence path
  running against this real deployment); and this first deploy was a direct overwrite
  into the live folder, not the "previous version kept alongside so rollback is a
  rename" pattern this task's own Accepts line calls for — a second deploy today would
  have no folder-rename rollback path.
  *Accepts:* a complete timed attempt, start to score, works when served from the NAS;
  rolling back is a folder rename with no rebuild. **Neither half confirmed yet.**
- ☐ **8.3 v1 acceptance (Mathematics only).** The session owner's own full
  timed test against the live NAS deployment, plus whatever ad hoc
  functional or graphic fixes it turns up (the nav-gap and questionCount
  bugs from the first NAS pass are the precedent for what this catches).
  This is the sign-off gate for the single-subject build — separate from
  Phase 10's four-subject final acceptance below.
  *Accepts:* session owner explicitly confirms the Mathematics-only app is
  accepted as production-ready.

### Phase 9 — Multi-subject entry (S1 redesign)

Re-enables 5101/5485/5652 in `data/manifest.json` (reversing 6.5.4's
single-subject simplification) and rebuilds `index.html` (S1) from a bare
`<ul>` of links into a picker that shows, per subject, whether it's been
started and some progress signal — not just a name and question count.
Gated on Phase 8.3 (v1 accepted) so this isn't built against a still-moving
Mathematics-only foundation. Likely mockup-first, same precedent as 6.6/6.8.

- ☑ **9.1 Mockup, iterate to sign-off.** Built as a published Artifact
  mockup (same precedent as 6.6/6.8) and signed off by the session owner.
  Two design forks decided via AskUserQuestion: a progress-forward **study
  hub** rather than a marketing landing page, and **status + best score**
  as the per-subject depth.
- ☑ **9.2 Re-enable manifest + build S1.** All four tests are `enabled: true`
  (5652 PR #77, 5101 PR #79, 5485 PR #81). `index.html` rebuilt from a bare
  `<ul>` of links into the signed-off study hub: per-subject cards carrying a
  status pill, best completed score on S6's own bullet bar (including its 75%
  readiness tick, so a score reads the same on both screens), a "pick up where
  you left off" callout, and a summary line. Scores are recomputed via
  `scoreAttempt` rather than read from each answer's cached `correct` flag,
  matching `js/results.js`'s never-cache rule — a cached shortcut here would let
  S1 disagree with S6 after any answer-key correction. Also closed the payload
  problem the redesign exposed: the picker used to fetch and parse **every bank
  file (~1.8 MB, serially)** just to read four scalars, invisible at 176 KB when
  only Mathematics was enabled and 10× worse once all four were. Display
  metadata (`name`/`timeLimitMinutes`/`formLength`/`bankSize`) now lives in
  `data/manifest.json`, with a new `validateManifestAgreement` check in
  `tools/verify.mjs` cross-checking every field against the bank it points at so
  the duplicated copies cannot drift. A bank is now loaded **only** for a subject
  that has a completed attempt to score: a new visitor fetches one small
  manifest and no banks at all.
  *Accepts:* S1 shows all enabled subjects with an accurate per-subject
  progress signal, matching real store data; a subject with zero attempts
  reads clearly as not-yet-started, not as an error or omission.

### Phase 10 — Final testing & acceptance (all four subjects)

Closes the project. Gated on Phase 7's resumed authoring (5101/5485/5652
reaching the same 3×-depth, answer-key-verified standard as 5165), Phase 9, and
**Phase 6.10** (the same three subjects' teaching chapters — D-32; 10.2 must not
sign off a build where three of four subjects dead-end on a visible Start-menu
control). Phase 8.3 is deliberately *not* gated on 6.10: it accepts the
Mathematics-only build, and Mathematics' chapters have been complete since 6.9.2.

- ☐ **10.1 Multi-subject regression pass.** Re-verify Phase 6.2/6.7's export/
  restore (`exportStoreAsJson`/`importStoreFromJson`) against a store holding
  real attempts across all four subjects, not just one — the store itself is
  already global (D-6/§2.8's schema was never per-test), so this is expected
  to need no code change, only confirmation once real multi-subject data
  exists to test against.
  *Accepts:* a downloaded backup, re-uploaded, restores all four subjects'
  history correctly.
- ☐ **10.2 Final live acceptance.** The session owner's own full pass across
  all four subjects on the live NAS deployment, plus ad hoc functional/
  graphic fixes as found — same discipline as 8.3, at full scope.
  *Accepts:* session owner explicitly confirms the complete four-subject app
  is accepted as production-ready.

### After Phase 10: spinning off `PRAXIS-iOS-<subject>` repos

Not a phase of this project — recorded here because Phase 10.2's completion
is the trigger for cross-project work in
[[project-praxis-ios-math]]. Session owner's sequencing decision
(2026-08-22, see D-30): finish PRAXIS-iOS-Math and get it fully
user-accepted as a standalone app *first* (in that project, independent of
this one), so it's a proven, settled template — only after that, and only
after this project's Phase 10.2 closes (all four subjects authored and
accepted here), do new `PRAXIS-iOS-<subject>` repos get spun off per
subject by copying PRAXIS-iOS-Math (D-12's recipe). Authoring the other
three subjects (Phase 7, resumed) does not by itself trigger any iOS work —
both halves need to be independently done first.

## Session log

| Date | Session | Outcome |
| --- | --- | --- |
| 2026-08-31 | Phase 7.2 — 5165 Functions & Calculus expansion verified and remediated (198 → 253) | Verification and remediation session for the 55 questions authored on the branch (II-A 39 → 64, II-B 21 → 51); `data/manifest.json`'s `bankSize` 198 → 253. **Answer-key verification**: two blind subagents, one per category, each re-deriving every answer from stem + options alone — writing Phase 1 conclusions to a scratch file *before* being allowed to open the stored key — then comparing and auditing explanations. **0 key discrepancies across all 55**, the fourth consecutive bank with a clean key set, which continues to confirm that the pass's real yield is explanation accuracy and test validity rather than the keys. 18 non-key defects found and fixed. **Explanations (8):** `0237` dropped the square from `f''(x) = 12x² − 24x`, showing `12(1) − 24(1)` — right answer by coincidence (1² = 1), wrong substitution, in a second-derivative item; `0236` said "the concavity changes sign" when `f''` changes sign and concavity changes down-to-up, in the one item meant to distinguish them; `0250` claimed a definite integral is "never" the correct measure of area below the axis and never taught the split-at-zeros technique; `0229` diagnosed the missing chain-rule factor but left the `−x/4` distractor's origin (a solved-for-*y* expression mistaken for a derivative) unexplained; `0199` used "neither" for three enumerated expressions; `0201`'s stem promised "the table below" with the values inline as prose, and its explanation said "(from the table)"; `0223`'s **keyed option** over-generalised, asserting a slant asymptote whenever the numerator's degree exceeds the denominator's, when it requires exceeding by exactly one — its own explanation already said "by exactly one", so the keyed option taught a second wrong degree rule in an item about misapplying a degree rule. **Letter/ordinal reference (1):** `0215` ended "Only the first option matches both conditions" — broken, since `shuffleQuestionOptions` (js/schema.js:281, called from all four assembly paths) randomises order and the UI never renders letters. **Test validity (2):** `0207` asked for "its vertical asymptote", the singular pre-eliminating the very misconception distractor the item exists to test; `0253`'s keyed option was the only one of four mentioning the river constraint, making it pickable with no calculus (all four options given parallel orientation phrasing, and "a maximum area" normalised to "an area" so the keyed option isn't the only one asserting maximality). **Cross-question give-aways (10 found, 1 fixed by scope decision):** the check added to the playbook after 5485's `emwaves-028` found substantially more here. `0250`'s stem prints `∫₀³(x² − 9)dx = −18` while `0249` asked for the area under `y = 9 − x²` on the same interval — the exact negation — handing over `0249`'s answer as a printed number; `0249` re-based onto `y = 12 − 3x²` on [0,2] (nonnegative throughout, area 16), which also cleared its old 27/9 distractors that collided with `0246`'s. The other nine (`0204`↔`0207`, `0213`↔`0216`, `0248`↔`0250` near-duplicates, plus six method give-aways) were **reviewed and deliberately accepted** — session owner's scope call — on the grounds that one item teaching a rule that helps on another is largely a practice app working as intended. **Key hygiene:** the 25 new II-A questions were 25/25 keyed `"a"`; re-spread by rotating each question's option contents and its key together, asserting per question that the key still resolves to the same option *content* and that no option text was lost. **Two of my own bugs caught by the checks built around the fix, worth recording:** the first rotation pass matched all 64 II-A questions rather than the 25 new ones, rewriting 39 already-merged questions (restored from a pre-edit backup, then scoped by diffing against `HEAD`); and a djb2 hash of the question id correlated across sequential ids (`5165-0199`, `-0200`, …), producing an even 7/7/6/5 spread with a visible 10-long `a,b,c,d` cycle — the exact `i % 4` failure mode 5485 hit. Switched to SHA-256, which avalanches: longest ascending/descending/same-letter runs are now 3/4/3 at n=25, chance level. **A larger pre-existing finding, deliberately deferred:** the 198 already-merged 5165 questions are 183/198 (92%) keyed `"a"` with **zero** `"d"` answers, and II-B was 21/21 `"a"` — 5165 is the only bank affected (5652 36%, 5101 27%, 5485 25% — the last re-spread deliberately on 2026-08-27). Runtime impact is nil because of `shuffleQuestionOptions`; it is a raw-JSON exposure. Left out of this PR because it rewrites already-live content and needs its own `PRAXIS-iOS-Math` sync and redeploy. Remediation was applied as a single asserted script editing the raw file text rather than parse-then-stringify, since the bank's hand-formatting (one-line `stem`/`options`/`explanation`, non-ASCII escaped) would otherwise have reflowed 244,713 → 321,771 bytes and buried the real edits; every edit asserted its own precondition, and the final diff is **893 insertions / 0 deletions** on `data/tests/5165.json`, mechanically confirming that none of the 198 pre-existing questions changed. Post-remediation measurement: no question's keyed option now reaches 1.6× the mean distractor length (`0223` was the only one, at 1.63, and the correctness fix plus a tightening pass brought it under), zero letter/ordinal references remain, and the new 55 key spread is 16/17/12/10. `verify.mjs` clean (0 errors, 0 warnings), 7/7 test suites green. No new decision logged — Phase 7.2 was already planned on this branch, and the give-away scope call is recorded here rather than as a D-number since it is a content-scope judgement, not a design fork. |
| 2026-08-29 | Phase 6.11.1 — Landing page visual refresh (masthead mark, hero illustration, motto) | [PR #88](https://github.com/homesik92/PRAXIS-Practice/pull/88). Ideation gathered via AskUserQuestion (welcoming/illustrated direction, results-page palette carried onto S1, a subtle personal accent rather than a literal Bill-the-Goat placement) collapsed the plan's three separate sub-phases into one continuous session — see D-34 for why. Added: a "Go Navy, Beat Army!" masthead wordmark (plain SVG text, `paint-order` outline), a hand-authored flat-vector classroom hero illustration (teacher + whiteboard, two seated students, colors from the existing results palette), and a two-line serif motto block. **The masthead mark went through real iteration, not straight to its final form** — a drawn Bill-the-Goat silhouette (rejected: invented an unstated USNA affiliation), the actual USNA athletics mark the session owner supplied (not used: redistributing someone else's registered artwork on a public repo is a different act than personally referencing it, regardless of monetization), a fouled anchor (shipped briefly, then judged unclear at final size), settling on plain colored text — full reasoning in D-33. **Two real bugs found and fixed mid-session, neither by a separate review pass:** an inline SVG sized by CSS `width` alone with no `height` attribute or `aspect-ratio` doesn't reliably derive its height from `viewBox`, silently cropping the mark to its top ~30% (fixed with explicit `aspect-ratio`, applied pre-emptively to the second SVG too); and the illustration's two seated students had their arm-rotation signs backwards, swinging away from the book/laptop props instead of toward them (caught while re-deriving the tapered-limb geometry for a "make the figures more realistic" pass). Verification: `node tools/verify.mjs` clean throughout (no data/schema touched); strict XML well-formedness checked on every inline SVG addition (caught an invalid `--` inside two HTML comments); CSS brace balance and the inline module script's syntax checked after every edit. Self-reviewed per Gate 3 (shallow — pure CSS/HTML, no code-review round run): confirmed no dead CSS survived the goat→anchor→wordmark churn, reduced-motion coverage extended to the new transitioning element, JS/data logic untouched. **Live-tested by the session owner across every design iteration** via hard-refreshes of the local dev server — the in-session Browser pane was non-functional for this entire session (blank screenshots, zero-size element rects), so each iteration was instead shown as a Claude-published preview Artifact before the session owner confirmed it live. CI green, merged (branch protection isn't configured on `main` yet, so this needed explicit go-ahead despite being shallow). Filed [issue #87](https://github.com/homesik92/PRAXIS-Practice/issues/87): whether/how `index.html`'s new visual complexity needs an iPhone-fit redesign is deferred to when the session owner resumes the `PRAXIS-iOS-Math` native-wrapper sync (D-30) — that wrapper doesn't bundle `index.html` today. Logged D-33 and D-34. |
| 2026-08-28 | Phase 6.10.1 — Computer Science (5652) teaching chapters authored, verified, fixed | All 10 leaf-category chapters authored via 10 parallel per-category subagents (concept overview/worked example/common mistakes, matching 5165's precedent), merged into `data/teaching/5652.json` (30 sections, 136 entries, zero id collisions), `teachingContent` key added to the 5652 bank. **Independent verification**, 5 subagents re-deriving every worked-example computation/trace from scratch before comparing: found and fixed 18 real defects (full list in the Phase 6.10.1 entry above) — the most severe being an off-by-one counterfactual stated twice in III-A, a `double`/`int` type mismatch in II-A's own "real division" pseudocode example, a self-contradicted IP/TCP-header claim in V-B, an overstated FERPA claim in I-B, and a firewall-visibility gap in V-B (missing that TLS's SNI field is sent in cleartext). Verified fully correct with no changes needed: the Caesar cipher (IV-A), the compound-growth simulation (IV-B), the selection-sort trace (II-B), and every TLS/HTTPS and ACM/FERPA/COPPA legal claim (I-B, V-B) — one verifier called the security content "unusually well-calibrated." `node tools/verify.mjs` clean, 312/312 tests green (data-only, no test changes needed). Live-tested in the browser: the exact "Networks, Security, and the Web" dead-end that surfaced D-32's gap now renders correctly with zero console errors; branch-category aggregation (parent "III") correctly shows both III-A and III-B together; II-A's number-base MathML renders as real typeset math (division, subscripts, superscripts, visually confirmed); 5485/5101 still correctly show "not yet written" pending 6.10.2/6.10.3. 6.10.1 flipped to ☑; 6.10 overview row moves to ◐ (one of three subjects done). No new decision logged — this executes Phase 6.10 as D-32 already scoped it. |
| 2026-08-28 | Doc-only — "Study a topic" content gap found; Phase 6.10 added (D-32) | Session owner noticed that picking "Networks, Security, and the Web" under Computer Science showed "No lesson has been written for … yet." and suspected the teaching chapters had only ever been authored for Mathematics. **Confirmed against the data, not assumed:** `data/teaching/` holds exactly one file (`5165.json`), and only `data/tests/5165.json` carries a `teachingContent` key — so 5652/5101/5485 all hit `teach.html`'s `!bank.teachingContent` branch, which renders precisely that message. **Root cause is a scoping gap, not a bug:** 6.9.2 was titled "Author Mathematics' 6 chapters" and closed correctly against its own Mathematics-only scope, while 6.9.3 wired a *generic* picker (`wireCategoryPicker`) covering every registered test — so the UI shipped for four subjects and the content for one. Phase 7 covered question banks only; Phase 10 is regression plus acceptance. The work was rostered nowhere, so 27 chapters (5652: 10, 5485: 9, 5101: 8 — counted from each bank's actual leaf-category tree) were invisible to the roadmap. Three forks settled by the session owner via AskUserQuestion: a **new Phase 6.10** rather than reopening 6.9 or folding into Phase 7 (keeps 6.9's ☑ honest — it really did finish what it described); **6.10 blocks Phase 10.2** but explicitly **not 8.3**, since 8.3 accepts the Mathematics-only build and Mathematics' chapters are complete — the reasoning being that 10.2 would otherwise sign off a build where three of four subjects dead-end on a visible Start-menu control, which Phase 9's study hub now presents as equals; and **one file per bank confirmed** over splitting per chapter, re-examining rather than inheriting the payload landmine 6.9.1 flagged (5165's 6 chapters are 53K, so 5652's 10 project to ~90K — one fetch on a local-network NAS; splitting would change the schema and `validateTeachingContent`, making data-only work deep). Also flipped the overview table's 6.9 row label to "…('Study a topic') — Mathematics", since the unqualified label is what made the gap invisible in the one place most likely to be read. Logged D-32, indexed. **No code, no content, no bank files touched** — the three authoring sessions are their own plan gates. |
| 2026-08-27 | CI gate wired up (GitHub Actions) | Closes the long-standing "until CI is wired up" gap that CLAUDE.md and the dev-workflow skill both referenced — until now `tools/verify.mjs` plus the seven `tools/test-*.mjs` suites were only ever run locally, which made them exactly as reliable as whoever remembered to run them. New `.github/workflows/verify.yml` runs the same commands on every pull request and every push to `main`. Deliberately dependency-free: no `package.json`, no lockfile, no build step (D-3), so there is nothing to install and no cache to warm — just `actions/setup-node@v4` on Node 22 and the commands themselves. One step per suite rather than a loop, so a red X in the Actions UI names the suite that broke instead of forcing someone to read the log. **Verified the gate can actually fail before trusting it**: confirmed all seven test files set `process.exitCode` on failure, then injected deliberate manifest/bank drift and confirmed `verify.mjs` exits 1 (and 0 once restored) — a workflow that always goes green is worse than no workflow. Prerequisite for the methodology's merge-on-green tier, whose stated mechanical precondition is branch protection actually enforcing the verification gate on `main`; the `main protection` ruleset (restrict deletions, block force pushes, require a PR with required_approvals=0 — zero deliberately, since GitHub forbids self-approval and a value of 1 would lock a solo maintainer out of their own repo) was created by the session owner in the same sitting, and the required-status-check rule gets added once this workflow has reported once on a real PR. |
| 2026-08-27 | Phase 9 — S1 study-hub redesign + front-page payload fix | Session owner asked for a real front page now that all four banks are done ("bare bones until now... we need a good web page"). That is Phase 9 exactly, which already anticipated "mockup-first, same precedent as 6.6/6.8"; Phase 9 was written as gated on Phase 8.3 (owner's v1 acceptance, still ☐) and the owner chose to move ahead of that gate, same spirit as D-31. **9.1**: two forks settled via AskUserQuestion — a progress-forward **study hub** over a marketing landing page, and **status + best score** depth — then an Artifact mockup built and signed off. Deliberately applied the app's existing `css/base.css` tokens rather than inventing a visual identity (the skill's own "honor what's already there" precedence), and kept `system-ui`: D-3 forbids runtime dependencies and the NAS is local-network-only, so a Google Fonts link would be both a violation and an offline failure — hierarchy comes from scale, weight and tabular numerals instead. **9.2**: `index.html` rebuilt as the hub; ~300 lines of S1 CSS appended to `css/base.css` scoped under `.page-hub` so the 60rem grid doesn't disturb the 40rem `main` every other page uses. **Live-testing the first commit found three real defects, all fixed** — it had been committed unrun under a token limit, so this was its first execution: (1) `loadStore()` returns an `{ok, store}` envelope, not the store, so `store.attempts` was undefined and the first `findInProgressAttempt` call threw, leaving the picker blank — now unwrapped like `test.html` does, falling back to `defaultStore()` and surfacing a note rather than inventing a "Not started" status that would be a guess; (2) the render body cleared the list before building it, so any unexpected throw showed an empty page with no explanation — wrapped in a try/catch that renders a real message and rethrows; (3) `grid-template-columns: auto-fit` packed 3 cards across at desktop widths and stranded the fourth subject alone on its own row — replaced with an explicit breakpoint giving 1 column on phones and a balanced 2×2 above 44rem. **Payload fix** (the redesign exposed it, measured live rather than assumed): the picker fetched and parsed all four banks — **1.83 MB, serially** — for five scalar fields. Display metadata moved into `data/manifest.json`; `loadManifest` now carries those fields through (only when present, so an entry without them stays the plain routing record it always was); new `validateManifestAgreement` in `tools/verify.mjs` cross-checks name/timing/formLength/bankSize/code against each bank, **verified by injecting deliberate drift and confirming it was caught with a message naming the fix**; and a bank is loaded only for a subject with a completed attempt to score. Measured after: a new visitor fetches **manifest.json alone, zero banks** (was 1.83 MB); a visitor with two scored subjects fetches exactly those two. Live-tested every card state by seeding real attempts through the store's own API — in-progress (resume strip, correct remaining-minutes math), completed above and below the 75% band, never-started, and empty-store — plus mobile at 375px (single column, no horizontal scroll). Best-of-attempts proved strictly by seeding a 90% attempt followed by a *worse* 70% one and confirming 90% renders. 312/312 tests green (+6: 2 for `loadManifest` metadata pass-through/omission, 4 for the drift guard, plus existing), `verify.mjs` clean. **Landmine, third occurrence:** browser caching muddied verification twice this session — a stale `index.html` showed the old page, then a stale `manifest.json` produced a phantom "NaN practice questions" that looked exactly like a code bug. `python3 -m http.server` sends no cache headers (the NAS sets `Cache-Control: no-cache`, so this is local-dev only); when a local live-test shows stale output, prime with `fetch(url, {cache:"reload"})` before concluding anything about the code. No new decision logged — Phase 9's design was already settled in ROADMAP. |
| 2026-08-27 | 5485 enabled in the manifest | Same one-line config change as 5652's ([PR #77](https://github.com/homesik92/PRAXIS-Practice/pull/77)) and 5101's ([PR #79](https://github.com/homesik92/PRAXIS-Practice/pull/79)) — `data/manifest.json`'s 5485 entry flipped `enabled: false` → `true` after merging the finished 375-question bank ([PR #80](https://github.com/homesik92/PRAXIS-Practice/pull/80)). **All four tests are now enabled**, so `index.html`'s picker lists the full v1 set for the first time. No code changes needed — `loadTestList` already handles any number of enabled tests. `verify.mjs` clean, 306/306 tests green. Covered by D-31 — no new decision entry needed. |
| 2026-08-27 | Phase 7 — 5485 full question bank (375 questions); **all four v1 banks now authored** | Final content-authoring session of Phase 7, same pattern as 5652/5101. Expanded `data/tests/5485.json`'s category tree from 4 flat top-level categories into BLUEPRINT.md's 9 subcategories (I-A/I-B, II-A/II-B, III-A/III-B/III-C, IV-A/IV-B) — session owner's call via AskUserQuestion, the 2–3-per-branch shape matching 5652's expanded tree rather than 5101's too-fine 33; ETS publishes no leaf-level weights for this test, so each branch's published count was split as evenly as the numbers allow (leaf counts sum to `formLength` 125, which `verify.mjs` enforces). Authored 375 questions (3× the 125-question real exam) across 9 parallel per-leaf subagents: I-A 27, I-B 27, II-A 36, II-B 39, III-A 42, III-B 42, III-C 39, IV-A 60, IV-B 63. **First bank to populate both cross-cutting overlays (SCHEMA.md §2.5) at scale** — `sep` 260/375 = 69% (≥50% target) and `tot` 116/375 = 31% (25–33% target), both hit on the first pass by giving each authoring agent its own per-leaf overlay quota, with no rebalancing pass needed. The known id-prefix landmine did not bite this time: agents were told their `5485-<slug>-NNN` prefix up front, so no post-merge rename pass was needed. **Answer-key verification**: 5 fresh subagents (scopes I-A+I-B+II-A, II-B+III-A, III-B+III-C, IV-A, IV-B), each re-deriving every answer from stem + options alone before reading the stored key or explanation — working every calorimetry, half-life, nuclear-equation, equation-balancing, stoichiometry, molarity, pH, kinematics, momentum-sign, circuit, and wave calculation by hand. **0 discrepancies across all 375 questions.** The 5652/5101 defect patterns were baked into the authoring prompts up front this time rather than found reactively, and the result shows: **0 letter/ordinal references bank-wide** (vs. 34 in 5652 and 19 in 5101 found after the fact), and only 16 length-tell candidates (4%, vs. 94% in one 5101 category) of which 8 were genuine justifying-clause tells and were fixed, the other 8 cleared by the verifiers as inherent content-length differences. The verification pass still earned its keep on explanation accuracy, finding 14 factual defects that no other gate could catch — none of which changed an answer key: `bonding-027` called an inverted g/(g·mol⁻¹) ratio "moles per gram squared" when it is reciprocal moles (worst of the set, since that item *is* the dimensional-analysis question); `bonding-037` claimed a single-bonded oxygen was short of an octet in a CO₂ Lewis structure when only carbon is; `reactions-010` said every distractor left oxygen short on the reactant side when one supplies it in excess; `nature-026` mischaracterized a 96.25% distractor as a ratio rather than 100% minus the percent error; `mechanics-030` labelled a coefficient×mass product "6.0 N" when it is not a force; `emwaves-006`/`-017`/`-043` mis-stated or failed to account for their distractor arithmetic; plus overstated claims in `stse-015` (fly ash "largely basic oxides"), `solutions-021` ("most salts" absorb heat on dissolving — false for CaCl₂/MgCl₂, also de-icers), and `emwaves-049` ("a million million times"). Three stems tightened: `reactions-009` now asks for the equation that "uses the correct formulas **and** is correctly balanced" (a distractor was atom-balanced but substituted O₃ for O₂), `mechanics-051` now specifies an **ideal** machine, and `emwaves-062` dropped an overclaim that its table-scratching activity demonstrates sound's *speed* when it only demonstrates transmission efficiency. Two test-validity fixes: `emwaves-028`'s correct option stated the general induction principle verbatim, giving away `emwaves-029`'s answer whenever both landed on the same form — restructured so all four options report only the observation, with the principle left to the explanation (shown only after submission); and `mechanics-014`'s ramp distractor was defensibly correct too (rolling spheres also accelerate independently of mass), replaced with a ramp-angle variation. Finally, bank-wide answer-key hygiene: several leaves had degenerate stored-key patterns (III-A was entirely `"a"`, II-A ran a strict `a,c,b,d` cycle for 32 consecutive questions, IV-A/IV-B skewed 30/26 toward `a`) — harmless at runtime since `shuffleQuestionOptions` runs on every form-assembly path, but a 100%-predictable key in the raw JSON. Re-spread deterministically by rotating each question's option contents and its key together using a hash of the question id, asserting per question that the key still resolves to the same option content and that no option text was lost; bank-wide spread is now 95/100/84/96 with a longest strictly-cyclic run of 5 (chance level). 306/306 tests green throughout, `verify.mjs` clean (0 errors, 0 warnings). No new decision logged — covered by D-31's existing authorization to resume 5485 authoring without re-litigating D-24's pause. |
| 2026-08-26 | 5101 re-enabled in the manifest | Same one-line config change as 5652's ([PR #77](https://github.com/homesik92/PRAXIS-Practice/pull/77)) — `data/manifest.json`'s 5101 entry flipped `enabled: false` → `true` (5485 stays `false`) after redeploying the finished 5101 bank to the NAS. No code changes needed. `verify.mjs` clean, 306/306 tests green. Covered by D-31 — no new decision entry needed. |
| 2026-08-26 | Phase 7 — 5101 full question bank (360 questions), continuing D-31's authoring-ahead-of-launch plan | Content-authoring session, same pattern as 5652's. Kept 5101's existing flat 8-category tree rather than expanding into BLUEPRINT.md's 33 subcategories — presented as an explicit design choice (several subcategories are as small as 2 questions per real draw), session owner chose the flat tree. Authored 360 questions (3× the 120-question real exam) across 8 parallel category-authoring subagents: I 54, II 54, III 36, IV 36, V 54, VI 36, VII 54, VIII 36. Merged into `data/tests/5101.json`, ids reprefixed `5101-<category>-NNN`. **Answer-key verification**: 4 fresh subagents, one per category pair, each re-deriving every answer from stem + options alone (working every calculation independently) before comparing to the stored key. **0 discrepancies found across all 360 questions.** The same pass caught one genuine content bug — `5101-bizlaw-024` had two defensible answers, since its "wrong" $900 office-supply purchase actually also cleared the UCC's $500 statute-of-frauds writing threshold (fixed by lowering the distractor's dollar amount below $500) — and a systemic length/justification tell far more severe than 5652's: the correct option was the longest in 94% of Category VIII's questions and 59% of Category III/V's, with several also carrying a justifying clause ("...because X") that no distractor had. Presented to the session owner as two scope decisions via AskUserQuestion: Category VIII (94% incidence) got a full rewrite of all 36 questions; the other categories got fixes only for the sharpest cases (≥1.6× length ratio or an embedded justification clause), not every borderline one. 5 remediation subagents fixed 101 questions total (34 in VIII, 27 in III/V, 21 in I/IV, 12 in II/VI, 7 in VII), plus 19 explanations that referenced options by letter ("Choice A...") or shuffle-dependent ordinal language ("...respectively") — broken since the app shuffles option order and never shows letters — and 2 minor overstated legal/privacy claims (`comm-032`'s protected-characteristics claim, `profed-018`'s FERPA claim). Post-fix measurement confirmed the remediation worked: Category VIII's longest-is-correct rate dropped from 94% to 31% (matching the ~25% chance baseline), with 0 sharp (≥1.6×) tells remaining bank-wide outside a couple of untouched borderline items. 306/306 tests green throughout, `verify.mjs` clean (0 errors, 0 warnings) against the finished 360-question bank. No new decision logged — covered by D-31's existing authorization to resume 5101/5485 authoring without re-litigating D-24's pause. |
| 2026-08-26 | 5652 re-enabled in the manifest | Doc-adjacent config change, ahead of Phase 9.2's originally-planned timing for this exact flip — the session owner asked for it directly after redeploying the finished 5652 bank to the NAS and noticing `index.html`'s test picker still only listed Mathematics. `data/manifest.json`'s 5652 entry flipped `enabled: false` → `true` (5101/5485 stay `false`); no code changes needed — `index.html`'s `loadTestList` and every other by-code lookup already handle any number of enabled tests, `data/manifest.json` was the only thing gating the second one from view. `verify.mjs` clean, 306/306 tests green (no test-relevant logic changed). Covered by D-31's authorization to move ahead of the original phase order for 5652 specifically — no new decision entry needed. |
| 2026-08-26 | Phase 7 — 5652 full question bank (300 questions), ahead of D-24's pause (D-31) | Content-authoring session. Authored the full 5652 (Computer Science) bank to D-23/D-27's 3× standard (300 questions against the real 100-question exam), across all 10 leaf categories of the tree expanded in the prior session: I-A 21, I-B 24, II-A 36, II-B 39, III-A 45, III-B 45, IV-A 21, IV-B 24, V-A 21, V-B 24. Each category drafted by its own subagent at high effort, given ETS's published Pseudocode Notation reference (for categories needing traced code) and an explicit avoid-list of scenario shapes glimpsed while extracting that notation from the Study Companion PDF, so nothing converged on ETS's own sample items. Merged into `data/tests/5652.json`, ids reprefixed `5652-<category>-NNN` to satisfy `tools/verify.mjs`'s id convention. **Answer-key verification** (SKILL.md's "high effort, verify independently" standard): 5 fresh subagents, one per category pair, each re-deriving every answer from stem + options alone — including hand-tracing every pseudocode snippet — before comparing to the stored key. **0 discrepancies found across all 300 questions.** The same pass also surfaced non-key defects, all remediated in this session before merge: 34 explanations that referred to distractors by letter ("Option C...") despite the app shuffling option order and never displaying letters (`js/schema.js`'s `shuffleQuestionOptions`, called from every form-assembly path) — rewritten to describe each distractor's content instead; one explanation (`abstraction-014`) whose stated arithmetic didn't match the distractor it claimed to describe; one stem (`algoanalysis-018`) claiming "four sorting algorithms" while only naming three; one stem (`control-022`) presenting a bare code snippet with no actual question sentence; 14 III-B stems with the same missing-question-sentence gap; and — the highest-effort fix — 39 of IV-A/IV-B's 45 questions where the correct option was conspicuously the longest and carried its own justifying clause the distractors lacked, a length/wordiness tell a test-savvy student could exploit without knowing the content (30 of the 45 rewritten: correct option trimmed to plain-assertion length matching its distractors, justifying reasoning relocated into the explanation). Also fixed a stale `tools/verify.mjs` warning that still cited issue #45 as open (claiming question rendering "only implements text today") — that gap closed in the prior session, so the warning was firing false positives against every `code`-format question in this bank; removed, with 2 `tools/test-verify.mjs` tests updated to assert its absence instead of its presence. 306/306 tests green throughout, `verify.mjs` clean (0 errors, 0 warnings) against the finished 300-question bank. Logged D-31 (this authoring happened ahead of D-24's post-launch pause, at the session owner's explicit request). |
| 2026-08-23 | Long-question box fix; "Clear performance data" added | Two items from the session owner's own live-testing. (1) A long word-problem stem overflowed `run.html`'s question box: `#question-fieldset`/`#study-fieldset` use a real `<legend>` for the stem so the fieldset's accessible name comes from it natively (Phase 3.4), but browsers only reserve border space for a legend's *first line* — any wrapped lines on a long stem spilled out above the box instead of inside it. Fixed with the standard `float: left; width: 100%` technique on `#question-stem`/`#study-stem`, which makes the legend lay out as a normal block inside the border instead of straddling it — confirmed working for both a short stem (no regression) and a deliberately long one (fully contained). (2) New "Clear performance data" control on `test.html`'s per-test start screen, next to the existing "Back up or restore progress" section: the real trigger is a full-length attempt's timer expiring while the person is away, silently crediting only a few questions and permanently becoming that test's "first attempt" on the dashboard with no way back to a genuinely fresh start. New `js/store.js` export `clearTestData(store, testCode, questionIds)` — a pure function scoped to one test's own `testCode`-tagged attempts and the specific question ids passed in (since `questionHistory` isn't test-scoped in the store), so it won't touch any other subject's saved progress in this same shared store, planned deliberately ahead of 5101/5485/5652 getting real content. Wired behind its own confirm dialog (matching the existing "Replace your progress?" pattern), with wording that explicitly says other tests aren't affected, since "Replace progress" right above it affects everything and the two are an easy pair to confuse. Button styled with a new `.btn-danger` class (`--color-incorrect`) to read as visually distinct from the backup/restore actions. 306/306 tests green (5 new for `clearTestData`), `verify.mjs` clean. Live-tested: seeded a real completed 5165 attempt plus a fake 5101 attempt/history entry, confirmed Cancel leaves everything untouched, confirmed clicking through erases only the 5165 data while the 5101 entries survive byte-for-byte, zero console errors. |
| 2026-08-23 | Phase 7 resumed — 5652 category tree expanded, issue #45 closed (rendering fix) | Prep work ahead of authoring the 5652 Computer Science bank (D-27's resume target: 300 questions, 3× the 100-question real exam). `data/tests/5652.json`'s category tree gained leaf children under all 5 branches (I-A/I-B, II-A/II-B, III-A/III-B, IV-A/IV-B, V-A/V-B) derived from BLUEPRINT.md's own condensed sub-topic bullets — matches F-6's "5652 has 10 [subcategories]" count exactly (2 per branch). ETS doesn't publish leaf-level weights for this test (unlike some of 5165's), so each branch's published count was split as evenly as the numbers allow; documented as the session owner's own reasonable allocation, not an ETS figure. `verify.mjs` clean with the expanded tree and zero questions. Separately, closed [issue #45](https://github.com/homesik92/PRAXIS-Practice/issues/45) (stem/option/explanation rendering never dispatched on `format`, always assumed `text`) ahead of authoring, since 5652's pseudocode needs `format: "code"` to actually render as a real `<pre><code>` block instead of collapsing to one run-together line. `js/reference-panel.js`'s `renderContent` gained a `code` branch; `run.html`'s render call sites (S3, S5, both drill modes) and `js/review-row.js` (shared full-review renderer) now go through it; `js/results.js`'s `buildFullReview` passes through `{format, value}` instead of flattening to a string (3 unit tests updated to match). Live-tested: existing plain-text questions unaffected, a synthetic `code`-format question renders correctly in both the live question view and the full-review list, zero console errors. Also pulled ETS's own published Pseudocode Notation reference (assignment/operator/control-flow/procedure syntax) from the Study Companion PDF for authoring consistency — this is the notation table itself (a style convention), not sample content, so it's within the blueprint-not-content rule; deliberately did not read into the PDF's actual sample-questions section. |
| 2026-08-23 | Second "Submit test" button added at the top of the review pass | Session owner request, after live-testing PR #72 on the NAS: the review pass's "Submit test" button only ever lived at the bottom, below the whole question list — a long form (5165's real test is 66 questions) meant scrolling through everything just to submit. Added a second `#submit-button-top`, same label, right below the review pass's intro paragraph, wired to the identical `openConfirmSubmitDialog` handler as the existing bottom `#submit-button` via a new shared `wireSubmitButtons(onOpen)` helper (both call sites — `beginRun`'s S3 review pass and `runCategoryDrill`'s drill review pass — now call this instead of attaching to `#submit-button` alone). `wireConfirmSubmitDialog`'s existing "return focus to whichever button opened the dialog, not just browser default behavior" guarantee now tracks a `submitTriggerButton` variable set by whichever of the two was actually clicked, rather than hardcoding `#submit-button`. Shallow, self-reviewed per Gate 3 — no persistence/scoring logic touched, `#review-screen` is shared identically by the real test and both drill modes so one change covers all three. 301/301 tests green (unchanged), `verify.mjs` clean. Live-tested locally: both the real full test and Practice-a-topic confirmed the top button opens the same confirm dialog with correct counts, Cancel correctly returns focus to the top button specifically (not always the bottom one), and confirming from the top button completes the attempt/drill identically to the bottom button (screenshot-confirmed placement above the question list). |
| 2026-08-23 | Practice-a-topic/Category-test UI polish, full review added | Five cosmetic/UX fixes from the session owner's own live-testing, none touching persistence: (1) `run.html`'s drill heading showed the subject name ("Mathematics") for both Practice-a-topic and Category-test — now shows the chosen category ("Algebra") instead, resolved via the same `flattenCategoryTree` lookup `runCategoryDrill` already used; (2) `#reference-list h3` (the Formulas & Notation panel's category headers) centered and given `--color-accent` plus a slightly larger size, to read as a clear section break rather than blending into the entries below; (3) `test.html`'s Category-test dropdown now lists only the four top-level groups (Practice-a-topic and Study-a-topic keep every depth, unchanged, per the session owner's explicit choice); (4/5) both Practice-a-topic and Category-test's completion screen (`runCategoryDrill`'s shared `showDrillComplete`) now shows the same full review results.html's S4 shows for a real attempt — every question, all options, chosen/correct marked in red/green text, explanation below — built via `buildFullReview(js/results.js)` against `drill.questions` (already form-shaped) and the closure's own `answers`. To avoid a third copy of the row-rendering markup, extracted `renderReviewRow`/`optionSuffix` out of `results.html` into a new shared `js/review-row.js`; `results.html` now imports it instead of defining it inline. New `#drill-full-review`/`#drill-full-review-list` markup lives inside the `#study-complete-screen` div S5's study mode also uses, but stays hidden there — confirmed live that S5's own `showDrillComplete` never populates or unhides it. All four touched files (`test.html`, `run.html`, `css/base.css`, plus `results.html`) are on the downstream-sync watchlist (D-30) — flagged in the PR. Shallow, self-reviewed per Gate 3. 301/301 tests green (unchanged — no new unit-testable logic), `verify.mjs` clean. Live-tested locally end-to-end for both untimed and timed drills: heading shows the category, dropdown option counts confirmed via DOM inspection, the formula panel's centered/accent headers screenshot-confirmed, and the full review's red/green marking and explanations confirmed both by DOM inspection and screenshot — including one deliberately-wrong answer to see the red "(your answer — incorrect)" / green "(correct answer)" pairing. Confirmed `localStorage` stayed empty throughout (this mode's core "never touches the store" property). Zero console errors. |
| 2026-08-21 | Dashboard "Review test" buttons | [PR #69](https://github.com/homesik92/PRAXIS-Practice/pull/69). Session owner's request after live-testing: a "Review test" button under each of the dashboard's "First attempt"/"Latest attempt" (or "Only attempt") meters, linking straight to that attempt's existing full green/red/explanation review. No new data or rendering logic needed — every completed attempt's exact question order and answers are already kept forever in `store.attempts` (never pruned), and `results.html?attempt=<id>` already renders the full review for any attempt id; this only adds the link. `buildMeterFigure` gained an optional `attemptId` param, wired at all three call sites (empty state intentionally gets none, since there's nothing to review yet). Shallow, self-reviewed. `verify.mjs` clean. Live-tested locally end-to-end: took two real full tests, confirmed the single-meter "Only attempt" case and the two-meter "First"/"Latest" case each show their own correctly-scoped review link, followed both, confirmed the existing "← Back to tests" link already returns to the dashboard (no changes needed there), zero console errors throughout. |
| 2026-08-16 | Repo scaffold & design planning | Created repo (local only, no remote), vendored and adapted the dev-workflow skill, wrote the initial doc set, logged D-1–D-6 and N-1–N-2, filed B-1–B-3, drafted SEED.md. Proposed an 8-session design plan; session owner approved a compressed 4-session version (D-7). **No code written.** |
| 2026-08-16 | Design session 1 — blueprint extraction | Extracted all four test blueprints from the study companions; category counts verified to sum to each test's stated total. Produced BLUEPRINT.md with six findings (F-1–F-6). Logged D-7–D-9 and N-3 (411-question v1 authoring load; spaced repetition in scope; screen flow). **One fork left open: question format.** |
| 2026-08-16 | Design session 2 — requirements & schema | Settled the open format fork (D-10: uniform now, extensible schema), added a one-review-pass end-of-run step (D-11), scoped in the two reference panels (D-12). Produced SCHEMA.md: screens S1–S5, form-assembly rules (weight-correct, shortfalls disclosed not backfilled), the variable-depth category tree + overlay axis, the question record (`type`/`correct[]` for painless format extension, `format` discriminator for text/mathml/code), and the progress store with SM-2-style spaced repetition and a mandatory pre-migration backup. Closed B-1, B-2. Filed B-4 (MathML support unverified), B-5 (reference-panel schema), B-6 (backup must land in Phase 0). |
| 2026-08-16 | Design session 3 — adversarial review | Two fresh, context-free reviewers (data integrity; UX/accessibility) found 19 issues against SCHEMA.md and BLUEPRINT.md — both independently flagged the same core gap: "resumable" was a stated requirement with no backing data model. Triaged and remediated 18 directly in SCHEMA.md (résumé/`status` field with per-answer write cadence, cross-tab `storage`-event reconciliation, auditable shortfall targets, SM-2 bootstrap values, visible storage-failure handling, `retired` flag instead of question deletion, progress export, backup retention policy, confirm-before-submit, screen-reader-queryable timer/position, a flag-toggle control, queued announcements, richer review-list rows, non-modal reference panels, first-run orientation copy). Zero rejected. **One escalated** (B-7): D-12's 5165 reference panel quietly narrowed BLUEPRINT.md's F-3 graphing-calculator requirement to a static formula sheet — three options recorded in REVIEW.md, awaiting the session owner. Logged D-13. |
| 2026-08-16 | Calculator fork resolved | Session owner chose D-14: build a scientific (arithmetic, log, trig) on-screen calculator for 5165, explicitly excluding graphing. Closed B-7, filed B-9 for the coding plan. Design stage now fully closed — proceeding to session 4. |
| 2026-08-16 | Design session 4 — coding plan | Nine phases, walking-skeleton shaped: tools/infra, a single-test walking skeleton (5165, 5-question placeholder bank), core data/persistence, runner completeness, study mode/dashboard depth, 5165/5485 reference materials, hardening, content authoring (parallel track), and NAS launch. Logged D-15 (multi-page static site; content authoring parallel to engine phases). Design stage complete. Session owner gave explicit go-ahead to start Phase 0. |
| 2026-08-16 | Corrected repo setup to match siblings | Mid-Phase-0, session owner corrected a misreading of D-2: this project uses the same local+GitHub workflow as splankna-ios/splankna-rebuild, not local-git-only — the NAS is production-only, for the final version. Created `homesik92/PRAXIS-Practice` (public), pushed full history. Restored PR/CI/issue-tracker language in SKILL.md, CLAUDE.md, CONTRIBUTING.md, README.md. Migrated BACKLOG.md's nine entries to GitHub issues #1–#10 (three closed with evidence). Logged D-16. Also filed issue #7 for a design fork noticed while starting Phase 0 (file:// support), still open. |
| 2026-08-16 | Docs — roadmap reformat & new requirement | Restructured ROADMAP.md to a phase-overview table plus per-task checklist format (matching checkers-demo's sibling project), converting every phase's tasks to leading-checkbox bullets with explicit `*Accepts:*` criteria. Added a new requirement — a weakest-category practice suggestion on S2 (accuracy-ranked, 5-question minimum sample, D-18) — to SCHEMA.md §1.1/§1.2, logged as D-18, indexed in DECISIONS-INDEX.md, and scheduled as task 4.4. Resolved D-17 in the design-plan table's status column (it read "In progress" past completion). **No code changed; Phase 1 still not started.** |
| 2026-08-16 | Phase 2.3 — spaced repetition scheduling | Merged [PR #23](https://github.com/homesik92/PRAXIS-Practice/pull/23). New `js/srs.js` implements SCHEMA.md §2.8's SM-2 recurrence, wired into `run.html`'s answer path and `assembleForm`'s draw (activating the least-recently-seen preference dead since Phase 2.1). `/code-review` at high effort found 7 findings, 5 fixed — three angles independently flagged the `questionHistory` store-merge belonging in `js/store.js`, not `run.html`; fixed via a new `recordQuestionHistory` helper and an explicit `recorded` flag on `recordAnswer`, replacing a fragile reference-equality check. Pinned the previously-unspecified ease deltas to the standard SM-2 constants, logged as N-4. One finding deferred to [issue #22](https://github.com/homesik92/PRAXIS-Practice/issues/22) (a cross-tab race extending an already-accepted Phase 2.2 residual gap). Live-verified end to end in the browser before and after remediation. 99/99 tests green. |
| 2026-08-16 | Phase 2.4 — shortfall audit trail | Merged [PR #26](https://github.com/homesik92/PRAXIS-Practice/pull/26). `js/results.js`'s `summarizeAttempt` gained `recomputeShortfalls`, surfacing SCHEMA.md §1.2's "underfilled bank is disclosed, never silently padded" requirement on the results screen for the first time — `categoryTargets`/`shortfalls` had been persisted since Phase 2.1/2.2 but never read by `results.html`. `/code-review` at high effort found 4 findings, 1 fixed: logged N-5 for the deliberate choice not to cross-check against the stored `attempt.shortfalls` value (matches the score's own recompute-fresh pattern; picked at plan-approval, confirmed against the code review's literal-spec-wording objection). Filed [issue #25](https://github.com/homesik92/PRAXIS-Practice/issues/25) for a real, pre-existing gap this PR inherits rather than introduces (score/shortfall both depend on the bank being unchanged between draw and viewing — true since Phase 1.3). Live-verified both the no-shortfall and an injected-shortfall case in the browser. 105/105 tests green. |
| 2026-08-17 | Phase 3.1 — flag and review pass | [PR #29](https://github.com/homesik92/PRAXIS-Practice/pull/29). `js/store.js` gained `updateAnswer` (replace-in-place) and a shared `requireInProgressAttempt` precondition helper; `js/runner.js` gained `excerptStem`/`buildReviewRows`; `run.html` gained a flag toggle and an end-of-run review screen (reopen/change any answer, Submit to score), plus a `priorHistory` field on each answer so a review-pass edit corrects spaced-repetition history from a frozen baseline instead of double-counting (N-6 — a genuine SRS-subsystem fork put to the session owner, decided against the offered recommendation). Résumé of a fully-answered attempt now lands in review rather than auto-scoring. `/code-review` at high effort (8 parallel angles) found 8 findings, 7 fixed directly (a real crash reopening a corrupted/answerless review row; stale Start-screen copy; a latent stale-reference bug; missing `priorHistory` test coverage; `findAttempt` reuse; the shared precondition helper; a redundant `currentFlagged` variable). One deferred to [issue #28](https://github.com/homesik92/PRAXIS-Practice/issues/28) (cross-tab review-edit race, same narrow shape as the already-accepted issue #22). Live-verified in the browser: flag → answer all 5 → review list → reopen/change an answer → SRS recomputes without double-counting → Submit scores correctly; also hand-verified the corrupted-row Reopen guard directly. 120/120 tests green. |
| 2026-08-17 | Phase 3.2 — confirm-before-submit | [PR #30](https://github.com/homesik92/PRAXIS-Practice/pull/30). `js/runner.js` gained `countReviewStatus`, a pure helper over `buildReviewRows`' output. `run.html`'s Submit button now opens a native `<dialog>` stating the unanswered/flagged counts before scoring; Cancel/Esc leave the attempt untouched, the dialog's own Submit calls the existing `finish()`. Shallow UI change, self-reviewed. Live-verified via script-driven clicks on a fresh tab with a click-event logger (this project's known stray-real-click landmine) confirming every transition was explicit: a normal run showed correct 0-unanswered/1-flagged counts, Cancel preserved `in-progress` status and returned focus to Submit, and a hand-edited attempt (4 of 5 questions covered, matching 3.1's corrupted-row technique) correctly showed "1 question unanswered, 1 question flagged." 123/123 tests green. |
| 2026-08-17 | Phase 3.3 — résumé flow polish | [PR #31](https://github.com/homesik92/PRAXIS-Practice/pull/31). `test.html` now leads with a "Resume attempt" entry (with an answered/total status line) ahead of "Take a practice test" when an in-progress attempt exists (finding #10). `run.html` gained a wall-clock deadline check on résumé: an already-expired attempt shows a new expired-screen (answered/total count, explicit "See your results" acknowledgment) instead of silently scoring on load; separately, the running timer now force-completes the instant it hits zero while the tab stays open, no confirmation dialog. Score-and-navigate logic factored into a shared `completeAndGoToResults` helper. Shallow-to-moderate change, self-reviewed. Live-verified all three paths in the browser with a click-event logger installed throughout: normal résumé landed back at the correct question; a hand-edited already-past deadline showed the expired screen rather than silently scoring; a live run caught at "0:15" remaining with zero clicks recorded navigated to results entirely on its own when time ran out (the verifying script was killed mid-wait by the navigation itself). 123/123 tests green. |
| 2026-08-17 | Phase 3.4 — runner accessibility pass | [PR #32](https://github.com/homesik92/PRAXIS-Practice/pull/32). `#timer`/`#position` gained `tabindex="0"` (finding #12); a serialized `announce()` queue over a static `aria-live="polite"` region plus a shared `transitionFocus` helper move focus and announce on every screen transition, never simultaneously (finding #15); `#status-note` gained `role="alert"`. `/code-review` at high effort (8 parallel angles) found 10 findings, 9 fixed: a real correctness bug in threshold pre-suppression (could suppress a fresh start's own threshold on an exactly-10/5/1-minute test — fixed via an explicit `resumingExistingTimer` flag and the threshold logic extracted to pure, unit-tested `js/runner.js` functions); a WCAG finding that résumé forced focus with no user gesture (fixed via `moveFocusOnFirstRender`); stale threshold announcements racing `finish()`'s navigation; `announce()`'s `requestAnimationFrame` stalling when backgrounded plus no error recovery (dropped rAF, added `.catch`, cut delay 700ms→~200ms); `<legend>`'s inconsistent cross-engine `.focus()` support (moved the focus target to the wrapping `<fieldset>`); `abortRun`/`showStatus` focus and re-announce gaps; the focus+announce duplication itself (extracted to `transitionFocus`). One finding deferred — the cross-tab `storage` handler's re-render now also steals focus mid-edit, a new manifestation of the already-accepted race in [issue #28](https://github.com/homesik92/PRAXIS-Practice/issues/28) (evidence comment added there). Live-verified in the browser with a click-event logger throughout: fresh start moves focus every time, résumé's first render doesn't, every later transition does; announcer queue fires in order with no clobbering (`MutationObserver`-verified); a live run at "1:00" remaining announced "1 minute remaining" exactly once at the crossing; `abortRun` correctly moves focus to the alert. 131/131 tests green. **Phase 3 (Runner completeness) is now fully done.** |
| 2026-08-17 | Flagged-review visual marker | Small ad-hoc fix from the session owner's own live-testing of Phase 3 (not tied to a phase task): a flagged review row's existing "(flagged)" text didn't stand out visually. Added a decorative 🚩 `.flag-icon` span to the right of a flagged row's Reopen button in `run.html`'s `renderReviewList`, `aria-hidden` since the text label already carries the same information to a screen reader (SCHEMA.md S1.3's "never by color/icon alone" — this is a sighted-user enhancement on top of the existing signal, not a replacement). Trivial CSS/HTML-only change, self-reviewed, no logic touched. Live-verified: renders only on flagged rows, positioned correctly, all 131 tests still green (none affected). |
| 2026-08-17 | Phase 4.1 — topic study screen | [PR #34](https://github.com/homesik92/PRAXIS-Practice/pull/34). New `js/schema.js` functions `flattenCategoryTree`/`categoryAndDescendantIds`/`assembleDrill` power a new S5 mode in `run.html` (category picker → untimed per-question drill with immediate reveal+explanation → completion screen), feeding `questionHistory` only, no attempt ever created. `test.html` gained a "Study a topic" link; `renderOptions` generalized for both S3/S5. Deep change — `/code-review` at high effort (8 parallel angles) found 10 findings, 9 fixed: an unguarded `correctOption` lookup that could crash the drill on a malformed bank; S5 had no cross-tab `storage` listener at all, so a stale snapshot could silently overwrite a concurrent tab's whole attempt (more severe than prior narrow cross-tab findings); a missing `&mode=` showed the literal string "null"; the `transitionFocus` helper Phase 3.4 explicitly extracted "so this pairing lives in one place" got reimplemented from scratch — hoisted into a shared `makeTransitionFocus` factory instead; `categoryAndDescendantIds`/`assembleDrill` each duplicated existing tree-walk/draw logic, now reuse `flattenCategoryTree`/`drawForCategory`; the mode list was enumerated twice; dead code removed. One architectural finding deferred (run.html accumulating multiple state machines with no module boundary; store.js has no first-class attempt-vs-history-write distinction) — bigger than this task's scope. Live-verified in the browser: full picker→drill→reveal→complete flow, focus/announce matching 3.4's precedent, `questionHistory` persisted with zero `attempts` created, both new error messages read correctly, full S3 regression pass clean. 144/144 tests green (13 new). |
| 2026-08-17 | Phase 4.2 — full results dashboard | [PR #35](https://github.com/homesik92/PRAXIS-Practice/pull/35). `js/results.js` gained `formatElapsed` and `buildFullReview`; `results.html` renders "time used" and a full post-submit review list (stem, all four options with chosen/correct marked in visible text, explanation) built by replaying the attempt's exact original form via `js/schema.js`'s `resumeForm` and recomputing correctness via `js/runner.js`'s `isCorrect` (self-verifying, matching the existing score/shortfall logic). `/code-review` at high effort (8 parallel angles) found 10 findings, 6 fixed: a `#full-review-list li` CSS selector matched the nested per-option `<li>`s too, wrapping every option in its own bordered box — scoped to `#full-review-list > li` and merged with `#review-list li`'s existing rule; `formatElapsed` had no guard against a negative/unparseable timestamp span (clock skew mid-attempt), now reports "time unavailable"; a `joinAnswers` helper was extracted into `js/runner.js` so `buildReviewRows` (S3) and the new `buildFullReview` (S4) share one join instead of each reimplementing it (three review angles converged on this); `optionSuffix` simplified from four branches to three; the review-row render loop now batches into a `DocumentFragment`. Also caught mid-review: this PR's own missing ROADMAP status update, and that Phase 4.1's merge had left the phase-overview table's Phase 4 row at ☐ instead of ◐ — both fixed here. Four findings deferred as pre-existing-class risks this diff makes newly visible, filed as [issue #36](https://github.com/homesik92/PRAXIS-Practice/issues/36) (`resumeForm`'s all-or-nothing degradation vs. `scoreAttempt`'s per-answer degradation, plus the unenforced `attempt.answers ⊆ attempt.questionOrder` invariant — related to #25) and [issue #37](https://github.com/homesik92/PRAXIS-Practice/issues/37) (`buildReviewRows` trusting cached `answer.correct` where `buildFullReview` recomputes it, plus `isCorrectOption` ignoring `question.type` unlike `isCorrect` — both gated by `verify.mjs`'s existing warn-only stance on non-`"single"` types, D-10). Live-verified in the browser: a real completed 5165 attempt with a genuine mix of right/wrong answers rendered every row correctly including the wrong-answer case's "(correct answer)" + "(your answer — incorrect)" pairing; the `resumeForm`-null fallback was verified by deliberately corrupting a `questionOrder` entry, confirming the score/category breakdown stays intact while the review list degrades to a status note. 34/34 relevant tests green (26 in `tools/test-results.mjs`, +2 `joinAnswers` cases in `tools/test-runner.mjs`), `verify.mjs` clean. |
| 2026-08-17 | Skip via flag (D-20) | Ad-hoc fix from the session owner's own live-testing of Phase 3.2 (not tied to a phase task): reaching "cannot advance without an answer, even a flagged one" and asking for it directly. Amends D-11's forward-only run: checking the flag toggle now reveals a "Skip this question" button — flagging alone still never advances (picking an answer after flagging keeps working exactly as before), Skip is a separate deliberate second action. A skipped question is recorded with an empty `chosen` (counted, reopenable in the review pass, drives the confirm-dialog's unanswered count for the first time via real navigation rather than hand-edited storage) and contributes no spaced-repetition update at skip time, but a later real answer in review applies the SM-2 update from the same `priorHistory` baseline captured at skip time. `run.html`'s `selectAnswer` was refactored into a shared `recordAndAdvance(question, chosen)`, used by both `selectAnswer` and the new `skipQuestion`. `js/runner.js`'s `buildReviewRows` and `js/results.js`'s `buildFullReview` both gained the same "a recorded-but-empty answer isn't the same as a real one" `answered` semantics. Deep change (the core answer-recording model, a settled decision amended) — `/code-review` at high effort (8 parallel angles) found 10 findings, 9 fixed: checking the flag toggle revealed the new Skip button with no screen-reader announcement, and skipping's advance announcement was indistinguishable from a real answer's — both fixed by routing through the existing `announce()` queue, converged on independently by two review angles; `showExpiredScreen` still used `attempt.answers.length` as the "answered" count, now wrong post-D-20 — fixed to filter on `chosen.length > 0`; `recordAndAdvance`'s `updateSrs` boolean parameter was fully derivable from `chosen.length > 0` and could theoretically desync from it — dropped, derived inline; `buildReviewRows`/`buildFullReview`'s `answered` check was reimplemented in both files with an unguarded `answer.chosen.length` (would throw, not degrade, on a corrupted record missing `chosen` entirely) — extracted into a shared, defensively-chained `isAnswered` export in `js/runner.js`; the SM-2 "compute from frozen baseline, fold into store" pairing was re-typed a third time in this diff on top of the two pre-existing occurrences in `commitEdit` and S5's `revealAnswer` — extracted into a shared `applySrsUpdate`, all three call sites now use it; the flag checkbox's accessible name didn't convey that it reveals Skip — added an `aria-describedby` hint; a stale `reopenQuestion` comment's premise ("every question is answered before review") no longer precisely held post-D-20 — reworded. One finding deferred: a skip left unresolved by submit time scores as a miss just like a real wrong answer (an asymmetry with a question the clock never reached at all, which scores nothing) — documented in D-20 as intentional exam-scoring convention, not fixed. One finding noted but left as-is: a skip's `elapsedMs` stays frozen at the near-zero pre-skip value even if answered much later in review — matches N-6's already-accepted "review edits don't update elapsedMs" limitation, not a new gap. Live-verified in the browser with the announcer wired to a MutationObserver (not just DOM-state inspection): flagging then skipping produced the exact announcement sequence "Skip this question button available." → "Question skipped." → "Question N of M"; the skipped row showed "(flagged) (not answered) 🚩" in the review list; the confirm-submit dialog correctly reported "1 question unanswered, 1 question flagged" through real navigation; reopening and answering the skip applied a fresh SM-2 entry from the correct baseline; results.html rendered the resolved question as a normal answered row with no leftover "unanswered" artifact. Also re-verified S3's normal answer flow and S5's study mode through the `applySrsUpdate`/`recordAndAdvance` refactor — both unaffected. 168/168 tests green across the full suite (35 in `tools/test-runner.mjs`, +8 new for `isAnswered`/`joinAnswers`/the skip scoring case; 27 in `tools/test-results.mjs`), `verify.mjs` clean. |
| 2026-08-17 | Review-pass list shows the chosen answer | Ad-hoc fix from the session owner's own live-testing (not tied to a phase task): the S3 review pass (`run.html`'s "Review your answers" screen — distinct from S4's Phase 4.2 "Full review" list, which already showed this) listed category, stem excerpt, and flag/answered state, but not what was actually chosen. `js/runner.js`'s `buildReviewRows` gained `chosenOptionText`, resolved from the question's own `options` against `chosen[0]` (D-10: v1 is single-select) — `null` both when unanswered and, defensively, if the stored id no longer matches any real option (a hand-edited record or a bank edited since the attempt), rather than throwing. `run.html`'s `renderReviewList` now shows `(id) text` (e.g. "(c) 4096") next to each answered row, with a fallback message for the unresolvable case. `SCHEMA.md`'s S3 review-pass description updated to match. Small, additive, low-risk change (no existing field's behavior changed) — self-reviewed rather than a full multi-angle pass, verified via unit tests (including the unresolvable-option-id case) and a live browser check: every answered row showed its real choice in the requested format, a skipped row correctly showed no answer text, and reopening/re-answering a question updated its displayed answer live. 170/170 tests green (37 in `tools/test-runner.mjs`, +4 for `chosenOptionText`), `verify.mjs` clean. |
| 2026-08-17 | Phase 4.3 — spaced-repetition entry point | [PR #41](https://github.com/homesik92/PRAXIS-Practice/pull/41). New `js/schema.js` export `assembleDueDrill(bank, {history, random, now})`: every non-retired question across the whole bank (not filtered by category — D-8's "time has passed" signal stays separate from D-18's "performance is poor" one) whose `questionHistory` entry's `dueAt` (`js/srs.js`) has passed, most-overdue-first, options shuffled; `.questions.length` doubles as S2's displayed count, one source of truth for both screens. `test.html` shows a "N questions due" link (only when N > 0) leading to a new `run.html` `due=1` query-param mode, which skips S5's category picker and runs a due-only drill through the same render/reveal/SRS-update loop the category drill already uses — `startDrill(categoryId)` was split into two call sites (due-mode, category-mode) that each assemble and validate their own drill before calling a new shared `runDrill(drill, {againHref})`. `/code-review` at high effort (8 parallel angles) found candidates from 6 of 8 angles (2 came back clean); after verifying against the actual code, fixed 4: `dueAtRank`/`lastSeenRank` duplicated the same read-history/parse-date/NaN-guard logic (reuse angle) — extracted a shared `parsedHistoryDate` helper, which also closed a latent gap neither had (line-by-line-scan angle): `history` being `null`, not just missing — a hand-corrupted store can have valid-JSON `questionHistory: null`, and this diff put that read on S2's every-page-load path rather than only a drill actually starting; `test.html` was refetching `manifest.json` and the current bank a second time, moments after `loadTestList` had already fetched both, converged on independently by the reuse, simplification, and efficiency angles (the efficiency angle additionally noted this delayed "Take a practice test"/"Study a topic" rendering behind an avoidable fetch) — rewritten to a single `loadManifest`+`loadBank` call that now backs the whole page, fewer round trips than even the pre-diff baseline; a comment (predating this diff) referencing the now-renamed `startDrill` function, caught independently by the cross-file-tracer and simplification angles. Three altitude-angle findings considered and left as-is, matching existing precedent rather than this diff introducing something new: `due=1` as a second `run.html` mode-adjacent query param outside `VALID_MODES` mirrors how `category=` already works today; `assembleDueDrill` reading `dueAt` inside schema.js mirrors how `lastSeenRank` already reads `lastSeenAt` there; S2's due count computed via `assembleDueDrill(...).questions.length` (a full sort+shuffle discarded for one number) is real but low-severity at today's bank sizes and would need a second due-predicate entry point to fix, undermining this diff's own single-source-of-truth goal — filed as [issue #40](https://github.com/homesik92/PRAXIS-Practice/issues/40) for revisit if bank sizes or profiling ever justify it. Live-verified in the browser via the established module-import store-seeding technique (no UI clicks, no stray-click exposure): seeded three `questionHistory` entries (two overdue, one not-yet-due) and confirmed S2 showed "2 questions due for review" with the correct link; followed it into a 2-question due drill ordered most-overdue-first as designed, answered both, confirmed each new `dueAt` landed in the future (so the count correctly dropped to 0 and the link disappeared from S2); confirmed a direct due-mode visit past that point showed "No questions are due for review right now."; confirmed a `questionHistory: null` store (the fixed edge case) loaded S2 with zero console errors instead of throwing; regression-checked both the pre-existing category-drill flow (correct `againHref` back to `category=I`, unaffected by the `runDrill` refactor) and S3's test-mode start screen. 178/178 tests green (45 in `tools/test-schema.mjs`, +9 new: 7 for `assembleDueDrill`, 2 for the null-history guard). |
| 2026-08-17 | Phase 4.4 — weakest-category suggestion | [PR #42](https://github.com/homesik92/PRAXIS-Practice/pull/42). New `js/schema.js` export `weakestCategory(bank, history)`: for each *leaf* category (SCHEMA.md 2.4 — a question always attaches to the deepest category it belongs to, the same granularity `js/runner.js`'s `scoreAttempt`/`js/results.js`'s per-category breakdown already use), aggregates `correct`/`seen` across its non-retired questions' `questionHistory` entries — cross-attempt-and-cross-study-session by construction, since `questionHistory` already accumulates from every real answer regardless of which of S3's two write paths or S5's `revealAnswer` produced it, needing no new write path. Eligibility is 5 *distinct* questions with any history, not 5 total `seen` (D-18's whole point is guarding against a suggestion built on a narrow sample — re-answering one or two questions repeatedly must not count); among eligible categories, picks the lowest accuracy, ties broken toward least-recently-practiced. `test.html` shows a "You're weakest in `<category>` (`X`% correct) — practice it" link when non-null, into the *existing* S5 category-mode path (`run.html`, Phase 4.1/4.3, unchanged by this diff — it already accepts any valid category id). `/code-review` at high effort (8 parallel angles) found candidates from 5 of 8 angles (3 came back clean); fixed 4: a hand-corrupted `questionHistory` entry's `correct` had no bound relative to `seen`, so accuracy could land outside `[0, 1]` and render as a nonsense percentage (line-by-line-scan angle) — clamped to `[0, seen]`; the tie-break comparator subtracted two `lastSeenAtMs` values, which is `NaN` when both tied categories have no parseable `lastSeenAt` anywhere in them — `NaN` coerces to "equal" in `Array.prototype.sort`, silently replacing the documented tie-break with array order (same angle) — rewritten as explicit comparisons; the `lastSeenAt` aggregation re-derived `lastSeenRank`'s own undefined-to-sentinel handling by hand instead of calling it directly (simplification angle) — now does; a comment claimed the weakest-category link was "the only pre-filtered entry point into S5," overlooking that Phase 4.3's due-count link also pre-filters (via `due=1`) — tightened to "only *category*-pre-filtered" (removed-behavior-audit angle). Three findings considered and left as-is, matching existing precedent rather than a new gap: a `.find()` label lookup instead of `results.js`'s Map-based `flattenCategoryLabels` mirrors `run.html`'s own already-reviewed single-lookup `.find()` precedent from Phase 4.1; a `?? categoryId` fallback on that lookup is provably unreachable for any bank passing `verify.mjs` but matches this codebase's broader always-have-a-fallback convention at negligible cost; an inline percent-rounding formula duplicates `results.js`'s unexported `percentOf`, not clearly worth a new cross-module import for one call site. Live-verified in the browser: since no real bank yet has 5 authored questions in one category (5165's 5 questions are one per category; the other three banks are still empty), tested the shipped `weakestCategory` function directly against a synthetic two-category bank via `javascript_exec` module import in the real browser engine — confirmed the correct category won on accuracy, confirmed both fixed edge cases (a corrupted `correct: 999` clamped instead of producing a >100% suggestion; two categories tied with only unparseable `lastSeenAt` values returned a valid result instead of throwing) — then confirmed on the real S2 page against 5165's actual data that a category with only 2 distinct answered questions (below threshold) correctly shows no suggestion, that the sibling "N questions due" link (Phase 4.3) still renders correctly alongside, that a `questionHistory: null` store still loads with zero console errors now that a second function reads it, and that navigating a weakest-category link's exact destination URL correctly starts the pre-filtered S5 drill. **Phase 4 (Study mode & dashboard depth) is now fully done.** 189/189 tests green (56 in `tools/test-schema.mjs`, +11 new: 8 for `weakestCategory`, 3 for the two correctness fixes). |
| 2026-08-17 | Phase 5.2 — 5165 scientific calculator | [PR #43](https://github.com/homesik92/PRAXIS-Practice/pull/43). New `js/calculator.js`: a pure, DOM-free tokenize→parse→evaluate expression engine (arithmetic with parentheses, x^y/x²/√, log/ln, trig + inverse trig with a degree/radian toggle, π/e constants — no graphing/matrices/programming, D-14 scope), never throws, `{ok, value|reason}` throughout. `run.html` adds the calculator UI: a non-modal, in-document-flow panel (SCHEMA.md finding #17 — never obscures the question stem, pushes the page down like `#study-feedback`), a one-shot "2nd" shift key remapping sin/cos/tan to their inverses, gated to `bank.code === "5165"` and shared between S3 and S5, reset per-question via `resetCalculatorForNewQuestion()` (angle-mode preference deliberately survives the reset; expression/shift state doesn't). Eight-angle `/code-review` at high effort found and fixed all six candidates: `aria-labelledby="calculator-heading"` added to `#calculator-panel` (it already had a visually-hidden `<h2>` heading with no ARIA link to it); a JSDoc claim that `calculator.js`'s `reason` field "matches other modules' contract" was false — `store.js`/`schema.js` use short machine codes (`"not-found"`, `"fetch-failed"`) while this module returns full human-readable messages meant for direct display — corrected; `insertAtCursor`/`calculatorBackspace` each independently re-derived `el.selectionStart ?? el.value.length` — extracted a shared `getSelectionRange(el)`; Escape only closed the panel from the expression input's own `keydown` listener, not from a keypad button or the close button — moved to a listener on `#calculator-panel` itself; the two `bank.code === "5165"` comparisons (`beginRun`, S5's drill start) consolidated into a `CALCULATOR_TEST_CODE` constant; ROADMAP.md's 5.2 entry flipped to ☑ with expanded scope. 218/218 tests green (29 new in `tools/test-calculator.mjs`), `verify.mjs` clean. Not yet live-tested by the session owner — offered before merge, owner chose to merge on green tests instead. |
| 2026-08-17 | Phase 5.1 — 5165 formula/notation panel | [PR #46](https://github.com/homesik92/PRAXIS-Practice/pull/46). Design pass first: settled `data/reference/5165-formulas.json`'s content schema (SCHEMA.md §2.9, D-21) — `{schemaVersion, testCode, sections: [{id, heading, entries: [{id, label, content: {format, value}}]}]}`, reusing §2.6's existing content shape rather than inventing a new one; sections are topic-organized, not tied to `categoryId`, since the panel is one continuous reference available throughout the test like the real exam's Help screen. Also closed [issue #2](https://github.com/homesik92/PRAXIS-Practice/issues/2) (MathML support, flagged "unverified" since Phase 2): checked current caniuse.com data directly — Chrome 109+, Firefox v2+, Safari v10+, 94.31% global usage — safe to use as originally recommended. New `js/reference-panel.js`: `createPanelShell` (the finding-#17 open/close/Escape/focus-return shell, deliberately scoped to cover 5165 now and 5485's Phase 5.3 panel later — NOT retrofitted onto the already-shipped calculator panel, a documented scope boundary) and `renderContent`, the first real implementation of the `format` (text/mathml/code) dispatch SCHEMA.md §2.6 has documented since Phase 2 but no code ever actually read — every existing question render call still does a bare `textContent` regardless of format, deferred to a new [issue #45](https://github.com/homesik92/PRAXIS-Practice/issues/45). Content: 21 original formula/notation entries across 4 topic sections (8 using real MathML — quadratic formula, power rules, distance formula, trapezoid/sphere/cone volume, standard deviation), authored from the math itself, not ETS's study companion. `js/schema.js` gained `loadReferencePanel`; `tools/verify.mjs` gained `validateReferencePanel`, wired into `main()`. Eight-angle `/code-review` at high effort found real issues from 6 of 8 angles; two were independently caught by two angles each (strong signal): a genuine race — `ensureReferencePanelLoaded`'s fire-and-forget fetch could resolve after `abortRun`/`showDrillComplete` already hid the toggle and re-show it on a screen that's supposed to be showing only the abort/complete state — fixed with a `referencePanelActive` flag reset by `hideReferenceToggle()`, checked before the async continuation applies its effect (kept as a second, separate flag from the pre-existing `referencePanelLoaded` rather than one combined flag, per this project's own "a boolean answering two different questions" landmine); and `loadReferencePanel` re-typing `loadBank`'s entire fetch/parse body instead of delegating to it — now delegates, remapping `bank` → `panel` on the result. One more fixed: `validateContentField` accepted `format: "mathml"/"code"` uniformly for question content even though question rendering doesn't support anything but `"text"` yet, and the repo now ships a real working `format: "mathml"` example a future authoring session could copy onto a question by mistake and ship broken — added a warning (not error) when a question-context caller passes a non-`"text"` format. Six findings considered and left as-is: `createPanelShell` not covering the calculator's own separate open/close logic (documented scope boundary, not a new gap); `referencePanelLoaded`'s guard being currently unreachable-twice (matches this project's own `beginRun`-reached-once-per-page-load precedent, same class as an existing comment already accepts elsewhere); the MathML gate's removal having no runtime feature-detection fallback (verified support is broad enough, and `renderContent`'s actual HTML-parser-based fallback degrades to legible plain text, not "blank," on an unsupported browser); `format: "code"` not implemented in `renderContent` (acknowledged gap in its own doc comment, no content needs it yet); no try/catch around `renderReferencePanel` after a successful fetch (matches `loadBank`'s own pre-existing lack of runtime shape validation — `verify.mjs` is this project's one documented gate); and sequential (not parallelized) file reads in `verify.mjs`'s `main()` loop (real but not worth the added complexity for a tiny local dev-only CLI tool). A genuine implementation bug caught only by live-testing, not any of the 8 review angles: the first `renderContent` implementation parsed MathML via `DOMParser(..., "application/xml")` with no `xmlns` on the authored values, so the browser never recognized the imported nodes as real MathML and every formula rendered as flat, unstyled, concatenated text instead of proper fractions/radicals/superscripts — fixed by switching to a `<template>` + `innerHTML` parse, which lets the browser's own HTML parser apply MathML's foreign-content namespacing automatically, exactly as if the markup had been authored inline; confirmed live afterward with real fraction bars, radical signs, and superscripts rendering correctly. 233/233 tests green (28 in `tools/test-verify.mjs`, 3 new for the format-warning; `loadReferencePanel` tests added to `tools/test-schema.mjs`), `verify.mjs` clean. Live-verified in the browser throughout (fresh port, `localStorage.clear()`, exclusively `document.querySelector(...).click()` via `javascript_exec`, never `computer` coordinate clicks, per this project's documented stray-click landmine): toggle appears for 5165 in both S3 and S5, stays hidden for 5101 (no `referencePanel` field); panel renders all 21 entries with correct MathML namespacing after the fix; close button and Escape (from a nested control) both close and return focus to the toggle; the panel deliberately stays open across a question advance (a formula sheet is consulted across several questions, not per-question scratch work, unlike the calculator); the calculator panel continues working unaffected alongside it; zero console errors throughout. |
| 2026-08-17 | S4 full review: color the correct/incorrect answer markers | Ad-hoc request from the session owner (not tied to a phase task): color `results.html`'s existing `optionSuffix()` text — "(correct answer)", "(your answer — correct)", "(your answer — incorrect)" — green/red respectively, coloring only the parenthetical suffix itself, not the option's own answer text. `renderReviewRow` switched from a single `textContent` assignment to a text node plus a `<span class="option-suffix-correct\|incorrect">` wrapping just the suffix; two new CSS variables (`--color-correct` #15803d ~5:1 contrast, `--color-incorrect` #b91c1c ~6.5:1 contrast, both meeting WCAG AA on white) and two classes added to `css/base.css`. The suffix text itself remains the real signal to a screen reader (SCHEMA.md S1.3 "never by color alone") — this is a sighted-user addition on top of it, same pattern as the flag icon (Phase 3-era ad-hoc fix). Display-only, no logic touched — self-reviewed rather than a full multi-angle pass, all 233 existing tests unaffected (no new tests needed, nothing to unit-test in a DOM color assignment). Live-verified: constructed a real completed attempt via the established ES-module-import technique (`assembleForm`/`startAttempt`/`recordAnswer`/`completeAttempt`/`saveStore`, no UI clicks) with a genuine mix of one correct and four incorrect answers, confirmed all three suffix variants render with the correct color and only the parenthetical text is colored (screenshot-verified), zero console errors. |
| 2026-08-17 | Phase 5.3 — 5485 periodic table + physical constants panel | [PR #48](https://github.com/homesik92/PRAXIS-Practice/pull/48). Design pass first: settled `data/reference/5485-periodic.json`'s content schema (SCHEMA.md §2.10, D-22), closing [issue #3](https://github.com/homesik92/PRAXIS-Practice/issues/3) — `{schemaVersion, testCode, elements: [{atomicNumber, symbol, name, atomicMass, category, group, period}], constants: [{id, name, symbol, value, unit}]}`, deliberately NOT reusing §2.6/§2.9's `{format, value}` content shape since this is fixed-field tabular data, not prose. Authored the full standard 118-element periodic table (bounded, verifiable scientific fact — every chemistry reference agrees on the same rows — so treated as no more a scope-narrowing candidate than 5165's full formula sheet was) plus 12 physical constants spanning BLUEPRINT.md's Chemistry/Physics categories, in plain-text scientific notation matching 5165's existing Unicode-superscript convention. Lanthanides/actinides use the standard printed-periodic-table convention of two display rows (period 8/9) below the main table. New rendering (`renderElementsAndConstants`) added directly to `run.html`, not `js/reference-panel.js` — that module's own scope is the generic panel shell (`createPanelShell`, reused as-is from Phase 5.1) plus 5165's own content renderer; 5485's grid-shaped content shares nothing renderable with 5165's formula list. `ensureReferencePanelLoaded` now picks a renderer and toggle/heading text from a `REFERENCE_PANEL_KINDS` map keyed by `bank.code` (previously hardcoded to 5165's own static HTML text). `tools/verify.mjs` gained `validateElementsAndConstants` plus a `validateReferencePanelContent` shape-dispatcher (routes by the loaded JSON's own shape — `sections` vs `elements`/`constants` — rather than hardcoding which code implies which shape). Eight-angle `/code-review` at high effort (one angle, the cross-file tracer, was killed mid-run by the harness and relaunched fresh) found real issues from 6 of 8 angles. Most severe, from the altitude angle: `validateReferencePanelContent`'s shape-detection alone couldn't catch a wrong-shape file wired into the wrong bank's `referencePanel` slot — copy-pasting 5165's §2.9 file into 5485's slot with only `testCode` hand-fixed to match would self-validate cleanly (shape-detected as `sections`, `testCode` matches) and only fail at runtime when `run.html` handed that data to the §2.10 renderer its `bank.code` picked — fixed by adding a `REFERENCE_PANEL_SHAPES` cross-check (mirroring `run.html`'s own code→kind map) so the validator now catches a code/shape mismatch directly, plus a defensive try/catch around the render call in `ensureReferencePanelLoaded` so any future shape mismatch degrades to a logged error instead of an uncaught throw. Also fixed: the header (`schemaVersion`/`testCode`) validation block, copy-pasted verbatim between `validateReferencePanel` and the new `validateElementsAndConstants`, extracted into a shared `checkPanelHeader` helper; the file's existing hand-rolled "`Set` + duplicate check" idiom (already flagged once in Phase 5.1's review and left) was about to grow to 9 occurrences with this diff's 3 new ones — extracted a `checkUnique` helper for the new call sites only, leaving the 6 pre-existing ones alone as out of this diff's scope; the 10 element-category ids were independently duplicated in `tools/verify.mjs` and `run.html` (2 angles both flagged this) — extracted into a shared `js/element-categories.js` module both files import (CSS's own class/variable list stays separately maintained, since CSS has no import-from-JS mechanism without build tooling — D-3 — but chemistry category names essentially never change); added a group/period grid-position collision check (two elements silently authored onto the same cell would have passed every existing check and only surfaced as an invisible visual overlap); and the lanthanide/actinide display rows rendered starting at the same column as the alkali metals instead of the conventional offset position — fixed with a render-time-only column offset, keeping the authored data's simpler documented meaning unchanged. Two cheap fixes from a non-reachable-today edge both angles A and B independently flagged: `ensureReferencePanelLoaded`'s map-miss path now correctly leaves `referencePanelLoaded` unset (so a hypothetical future call would log again rather than silently never retry). 254/254 tests green (49 in `tools/test-verify.mjs`, 10 new: 5 for the shape/code cross-check, 2 for the grid-position collision, 3 more already covered by the earlier §2.10 additions), `verify.mjs` clean. Live-verified in the browser (temporarily added 2 real questions to 5485's placeholder bank to reach the run screen through the normal Start-button flow, since the bank has 0 real questions and the app correctly refuses to start a run otherwise — reverted precisely afterward, confirmed via `git diff` matching only the intended `referencePanel` field addition, after an earlier `git checkout --` accidentally wiped that same legitimate change along with the temp questions and had to be re-applied): all 118 elements + 12 constants render; toggle correctly reads "Periodic table & constants" for 5485 and "Formulas & notation" for 5165 (regression-checked); calculator toggle correctly stays hidden for 5485 (BLUEPRINT: no calculator needed) and still works unaffected for 5165; close/Escape/focus-return all work; f-block rows visually offset after the fix; zero console errors throughout. **Phase 5 (Reference materials) is now fully done.** |
| 2026-08-18 | Phase 6.1/6.3 — verify and close (no new code) | Doc-only PR. On starting Phase 6, found `js/store.js`'s storage-failure handling and backup-retention pruning were already fully built and unit-tested — both landed incrementally as code-review fallout from earlier phases (visible in the file's own "code review finding" comments) but never had their ROADMAP checkboxes flipped. Confirmed rather than assumed: `loadStore`/`saveStore` already return tagged `{ok:false, reason, ...}` results for corrupted JSON, quota-exceeded writes, and future-version stores (never reinitializing); `run.html`/`results.html` already surface visible messages at every call site; `backupBeforeMigrate`/`pruneOldBackups` are already wired into `loadStore`'s migration path with regression coverage including "prune still runs when a migration is missing partway through the chain." `node tools/verify.mjs` + all `tools/test-*.mjs` confirmed green (254/254) as a baseline. Live-verified the two UI-observable paths unit tests can't cover, in a fresh browser tab (`python3 -m http.server 8441`, `localStorage.clear()`, `document.querySelector(...).click()` via `javascript_exec` only): (1) a corrupted `localStorage` value shows "Your saved progress could not be loaded, so this test can't be started right now." on `run.html`'s start screen, and the raw corrupted value is left untouched in storage afterward (devtools-recoverable, confirmed via a direct `getItem` read); (2) a monkey-patched `Storage.prototype.setItem` throwing `QuotaExceededError` on the Start click shows "Your progress could not be saved, so this test can't be started right now." and leaves the key unset afterward (no partial/corrupted write). 6.3's retention behavior has no live-reachable trigger today (`CURRENT_VERSION` has never incremented past 1, so no real migration has ever shipped) — relied on the existing `tools/test-store.mjs` regression suite for that half, which already exercises the exact "keep only immediately-prior backup, across a missing-migration chain" scenario end-to-end through `loadStore` itself, not just via internals. Flipped 6.1 and 6.3 to ☑; 6.2 (progress export) and 6.4 (full accessibility pass) remain open, so Phase 6's overview row stays ☐. |
| 2026-08-18 | Phase 6.2 — progress export | [PR #50](https://github.com/homesik92/PRAXIS-Practice/pull/50). New pure `exportStoreAsJson(store, {now})` in `js/store.js` — deliberately DOM-free (returns `{filename, content}`, no Blob/anchor) so it's unit-testable under Node; `test.html` (S2) turns that into an actual client-side download via a temporary `<a download>` + `Blob`/`URL.createObjectURL`. Per SCHEMA.md's finding #9, the button exports the **whole store** (every test's attempts + history), not just the test this S2 page happens to be for — there's no more natural single home for one global export action. The click handler re-loads the store fresh at click time rather than reusing the page-load snapshot (another tab may have written since), and surfaces a visible message ("Your progress could not be loaded, so it can't be exported right now.") on a failed load instead of silently doing nothing or exporting stale/garbage data — same visible-failure convention as 6.1. Shallow change (a pure, read-only serialization helper plus a client-side download — never writes to storage, so no data-loss risk), self-reviewed rather than a full 8-angle pass, per the session owner's own go-ahead. 256/256 tests green (2 new in `tools/test-store.mjs`: filename format, and a round-trip-equality check against the input store), `verify.mjs` clean. Live-verified in the browser (fresh port, `localStorage.clear()`, seeded one real in-progress attempt via the ES-module-import technique, `document.querySelector(...).click()` via `javascript_exec` only): intercepted the anchor's `href`/`download` right before the synthetic click (with `URL.revokeObjectURL` patched to a no-op so the blob URL survived long enough to `fetch()` back) and confirmed the exported JSON is valid, filesystem-safe-named, and byte-for-byte equal (after parse) to the live store; separately confirmed a corrupted store shows the visible failure message instead of downloading anything. |
| 2026-08-18 | Phase 6.4 — full accessibility audit (no code changes) | Doc-only PR closing out Phase 6. Audited all five screens (S1 index, S2 test menu, S3 test runner, S4 results, S5 study) rather than assuming the runner's existing Phase 3.4/5 investment covered everything: (1) computed WCAG contrast ratios for every color pair in `css/base.css` (links, status colors, the 10 element-category swatches, calculator keys) — all ≥5:1, comfortably clear AA; (2) grepped every HTML file for custom-role widgets (`role="button"`, non-native `tabindex`) — found none, meaning every interactive control site-wide is a native `<button>`, `<a href>`, `<input type="radio">`, or `<input type="checkbox">`, so keyboard activation is guaranteed by the browser spec rather than something the app implements itself; (3) walked the accessibility tree (`read_page`) on all five screens with real seeded data, confirming correct heading hierarchy, landmarks, list structure, and that radio-button labels compute to the real answer text, not the option id. Found zero real defects — three apparent anomalies during testing (a `resumeForm` null and an empty shortfall section on S4, a button that appeared keyboard-unreachable on S2) all traced to testing-method artifacts (a wrong synthetic-data shape, a stale accessibility-tree read, and a browser-automation limitation with synthetic key events, respectively), each ruled out by cross-checking against direct DOM state rather than trusted at face value. Flipped 6.4 and Phase 6's overview row to ☑ — **Phase 6 (Hardening) is now fully done.** Verification method note, matching this project's own established caveat: this was a keyboard-focus-order + accessibility-tree audit, not a real assistive-technology (VoiceOver) pass — that remains the session owner's to do, same as it's been for 3.4's focus/announcement behavior. |
| 2026-08-18 | Phase 7 — 5165 full question bank (198 questions) | Content-authoring session, not code. Session owner scoped this ahead of Phase 7's original breadth-first plan (D-23): build 5165 (Mathematics) to full completion before starting any other test, and make each bank 3× the real exam's length rather than 1×, so a first practice test, topic study, and a second ("final") practice test each surface materially different questions. Restructured `data/tests/5165.json`'s shell from Phase 1's 5-question placeholder to the real BLUEPRINT.md parameters: `timeLimitMinutes` 15 → 180, `formLength` 5 → 66, and the full category tree with I/II split into their real subcategories (I-A Number & Quantity 7, I-B Algebra 13, II-A Functions 13, II-B Calculus 7, III Geometry 13, IV Statistics & Probability 13 — summing to 66), plus the `overlays` declaration for the Task of Teaching Mathematics cross-cutting overlay (SCHEMA.md §2.5, `targetShare: 0.25`). No schema or engine code changed to support the 3× depth — `js/schema.js`'s existing least-recently-seen draw logic (`drawForCategory`, built for spaced repetition in Phase 2.3) already rotates a deep category pool toward unseen questions automatically. Authored 193 new original questions (5 placeholders re-tagged onto real leaf categories) across 10 batches, each verified structurally against `tools/verify.mjs` before moving to the next: I-A 21, I-B 39, II-A 39, II-B 21, III 39, IV 39 — exactly matching BLUEPRINT.md's real weights ×3. 48 of 198 (24.2%, close to the 25% target) carry the Task of Teaching overlay, mostly framed as diagnosing a specific, plausible student misconception (e.g. inverting a similar-triangle ratio, the gambler's fallacy, confusing variance with standard deviation) rather than generic "a teacher wants to..." framing, so the overlay content pulls double duty as genuine pedagogical-reasoning practice, not just a content-category label. Every question written from scratch against the underlying math skill, never adapted from the ETS study companion (the project's standing copyright rule). **Answer-key verification**, per SKILL.md's "question authoring: high effort, verify independently" standard: 5 fresh subagents, one per leaf-category group, each given only `{id, stem, options, claimedCorrect}` — no explanations, no authoring reasoning — independently re-derived every answer from scratch and checked for exactly-one-defensible-correct-option. **0 discrepancies found across all 198 questions.** 256/256 tests green throughout (no test files changed — this is data-only), `verify.mjs` clean. Live-verified in the browser: a real `assembleForm` draw against the finished bank produces exactly 66 questions matching BLUEPRINT's category targets with zero shortfalls; the real runner UI starts a full 66-question/180-minute attempt with no console errors (previously only ever exercised at 5-question scale); a full attempt completed via the established module-import technique renders correctly on the results page with the real 6-category breakdown (Algebra/Functions/Statistics & Probability/Number and Quantity/Calculus/Geometry) summing to 66, correct/incorrect coloring and explanations all intact. Logged D-23. |
| 2026-08-18 | Pause other tests until production | Doc-only PR. Logged D-24: content authoring on 5101/5485/5652 stays paused until the app is complete and in production, then resumed (and possibly extended). |
| 2026-08-18 | Phase 6.6 — progress dashboard visual redesign | Session owner asked for the dashboard to look "professional and colorful" instead of plain lists. Iterated as a published Artifact mockup first — including a side-by-side comparison of four bar styles (rounded pill, segmented gauge, bullet graph, hairline+marker) — before touching real code; session owner picked the bullet graph. Built into `dashboard.html`: circular meters (one hue, two shades) for the attempt comparison with a delta indicator, bullet-graph bars with a 75% threshold tick for the category breakdown, status chips (icon + text, never color alone). Deliberately light-only, matching every other screen in the app; reuses `--color-accent`/`--color-correct`/`--color-incorrect` rather than a new palette. Also closed two small pre-existing findings while in the file: `percentOf` (js/results.js) exported and reused by `dashboard.html`/`test.html` instead of three duplicate inline copies; `dashboard.html`'s category-label lookup switched to the existing `flattenCategoryLabels` instead of a hand-rolled duplicate. Mid-mockup-review, session owner also asked for a "category test" option (10 questions, one category, explicitly not recorded/no stats effect) — recognized as new architecture (a new ephemeral `run.html` mode, not a display change) rather than part of the visual redesign; session owner's call to ship the redesign now and defer the real feature to its own plan (6.6.2, still open). The "Start another test" section previews the control today as a real but `disabled` dropdown + button with a "Coming soon" badge. Self-reviewed (CSS/UI + a benign function export, not a deep change). 273/273 tests green, `verify.mjs` clean. Live-verified in the browser: zero/one/many-attempt comparison states, all four category-status tiers with real seeded history (including the pending "N of 5 answered" state), the disabled category-test control's real `disabled`/`aria-disabled`/opacity/cursor state, and the 375px mobile layout — zero console errors throughout. |
| 2026-08-18 | Phase 6.5 — workflow & progress dashboard | New `dashboard.html` (S6) plus supporting aggregation helpers: `js/store.js`'s `findFirstAndLatestAttempts` (earliest/latest completed attempt for a test code), `js/schema.js`'s `aggregateCategoryStats` (every leaf category's all-time accuracy, sharing a newly-extracted `aggregateHistoryByCategory` helper with the pre-existing `weakestCategory` rather than duplicating its aggregation loop), and `js/results.js`'s `categoriesNeedingPractice` (this attempt's own under-practiced categories, deliberately attempt-scoped rather than cross-attempt). `test.html` gained a "View progress dashboard" link (once a completed attempt exists); `results.html` gained a "Practice your weak spots" section linking each flagged category into S5's existing drill. Separately, per the session owner's own design simplification, `data/manifest.json` now runs one subject at a time (5165 `enabled: true`, 5101/5485/5652 `enabled: false`, config-only) and `index.html`'s copy no longer hardcodes "four." 273/273 tests green, `verify.mjs` clean throughout. Deep change (progress-persistence-adjacent) — 8-angle `/code-review` at high effort found 9 findings; the most severe, confirmed independently by 3 angles, was that gating a bank lookup on `enabled` (as `results.html`/`run.html`/`test.html`/`dashboard.html` all did) silently orphaned review/resume access to any *already-completed* attempt on a test disabled by the 6.5.4 manifest change — fixed by giving `loadManifest` an `includeDisabled` option and switching all four pages' by-code bank lookups to pass it, so only S1's start-a-new-test list (`loadTestList`) still filters to enabled tests; this also happened to unify results.html/run.html's hand-rolled raw-fetch lookup with test.html/dashboard.html's `loadManifest`-based one (an altitude-angle finding, fixed as a side effect). Second confirmed finding: `tools/verify.mjs` was skipping schema validation for any disabled bank, silently losing answer-key-verification coverage for a test that's still reachable by direct URL — fixed by dropping the `!entry.enabled` short-circuit, validating every registered bank regardless of enabled state. Remaining findings (CSS rule duplication, two duplicated magic-number thresholds, a duplicated percent-rounding formula, a wasted per-question computation, one redundant early-return branch) left as-is — each low-severity, easily rediscoverable, not worth a GitHub issue on its own. Live-verified in the browser: seeded a completed attempt for a disabled test (5101) and confirmed `results.html`, `test.html`, and `dashboard.html` all correctly resolve and render it (previously would have shown "could not be loaded"/"not registered"), zero console errors; separately confirmed the dashboard/practice-links flow end-to-end on the still-enabled 5165 test (first-vs-latest comparison, per-category breakdown, "Practice your weak spots" linking to the exact two deliberately-failed categories with correct "missed N" counts). **Phase 6.5 is now fully done.** |
| 2026-08-20 | Doc-only — remaining v1 scope formalized (D-27) | Session owner listed six remaining project-level tasks (S2 redesign, v1 acceptance, S1 multi-subject redesign, author the other three banks, verify cross-subject export/import, final acceptance) and asked what was missing from the docs. Confirmed against D-4/D-23/D-24: the plan itself was already decided, just not scheduled as ROADMAP.md phases — added Phase 6.8 (S2 redesign, ◐, in mockup iteration — see 6.8.1), Phase 8.3 (v1/Mathematics-only acceptance, gates Phase 9), Phase 9 (S1 redesign + re-enabling 5101/5485/5652 in the manifest), and Phase 10 (final four-subject testing and acceptance). Phase 7's resume target made explicit (1,035 questions across the three remaining tests, at D-23's 3×-depth standard). Confirmed items 1 and 5 needed no new work: item 5 (multi-subject download/upload) is already satisfied by the store's existing global (not per-test) shape — folded into Phase 10.1 as a verification step, not a build task. Session owner's call (via AskUserQuestion): 6.6.2's deferred "category test" mode folds into the new Phase 6.8 S2 redesign rather than shipping as its own separate later pass. **No code changed.** |
| 2026-08-20 | Phase 6.8.2 PR A — S2/S6 page merge | `dashboard.html`'s rendering folded into `test.html`; `dashboard.html` deleted. Category breakdown is now zero-filled (every leaf category from the bank's own questions shows a `pending` row before any history exists, not just touched ones); résumé/due/weakest-category links grouped into one "Pick up where you left off" callout; the Start section gained #2–#4 as real, populated `disabled` stubs and #5 (relabeled from "Study a topic" to "Review a topic"). No persisted-data shape change. Moderate change, self-reviewed per the plan. Live-testing caught one real bug before it shipped: a new `.continue-callout { display: flex }` CSS rule silently overrode the browser's own `[hidden]` default (author styles beat the UA stylesheet once `display` is declared, regardless of source order), so the empty callout rendered even with `hidden` correctly set on a fresh store — fixed with an explicit `.continue-callout[hidden] { display: none }` override. 284/284 tests green, `verify.mjs` clean. Live-verified in the browser (hand-constructed store written directly to `localStorage`, this project's established technique): zero-state (meter "Not started," all six categories pending, no callout), populated state (resume + weakest-category callout items, both meters with correct delta, mixed category statuses), and the download/upload backup flow, all correct with zero real console errors. Phase 6.8.2 PR B (the shared practice/category-test `run.html` mode) not started — deep change, full 8-angle review required. |
| 2026-08-20 | Doc-only — Phase 6.8's Start menu settled at five entries; Phase 6.9 split off (D-28) | Continuing the S2/6.8 mockup discussion: the session owner specified the real Start-menu shape — full test (unchanged), Practice a topic (new, untimed 10Q/one-category flag-review-pass, unrecorded), Category test (new, same but timed — shares one new `run.html` mode with Practice via a timer flag rather than being a separate build), Study a topic (new destination — a textbook-chapter-style teaching page per category, ships as a `disabled` stub only, real content split into new Phase 6.9), and Review a topic (today's existing S5 immediate-reveal drill, kept exactly as-is per the session owner's call via AskUserQuestion, relabeled since "Study a topic" now names the new teaching-page destination instead). 6.8.2 rewritten with this scope, split into two PRs by risk (page-merge, self-reviewed; the shared Practice/Category-test mode, deep — full 8-angle review required, its central job being to prove the mode never calls `recordAnswer`/`completeAttempt`/`recordQuestionHistory`). New Phase 6.9 added (design pass → author Mathematics' 6 chapters → wire up the control), not started. Logged D-28, indexed in DECISIONS-INDEX.md. **No code changed yet — 6.8.2's real build starts next.** |
| 2026-08-20 | Phase 6.8.2 PR B — shared practice/category-test mode | New pure `assembleCategoryDrill(bank, categoryId, {count, random})` in `js/schema.js` (same category-and-descendants least-recently-seen draw as `assembleDrill`, capped, deliberately takes no `history` param at all since this mode never reads the store) and a new `run.html` `mode=drill` covering both Practice a topic (untimed) and Category test (timed, `&timed=1`) — 10 questions, one category, the same flag/skip/review-pass/confirm-submit UI a real test uses, scored locally via a local `answers` array. Deliberately never imports/calls any of `js/store.js`'s mutating exports — "never touches the store" is true by construction, not by carefully avoiding certain calls. Reuses `js/runner.js`'s pure `buildReviewRows`/`countReviewStatus`/`scoreAttempt` directly and the same `#run-screen`/`#review-screen`/`#confirm-submit-dialog` DOM S3 already uses. `test.html`'s two disabled stubs enabled for real. 8-angle `/code-review` at high effort found 5 findings, all fixed: a real bug (Angle A, must-fix) — the drill's `finish()` never closed `#confirm-submit-dialog` before revealing the completion screen (harmless in the real S3 flow, whose `finish()` always navigates away via `location.href` instead, discarding the dialog with the page), so a Category Test's clock expiring while the confirm-submit dialog was open left a stale modal stacked on the already-scored completion screen underneath — fixed by closing the dialog first if open; ~130-150 lines duplicated between `beginRun` and the new `runCategoryDrill`, converging from 3 angles (reuse/simplification/altitude), extracted into three shared `run.html`-level helpers — `tickCountdown` (the timer/threshold-announce body), `renderReviewListInto` (the review-row-building loop), `buildConfirmSubmitMessage`/`wireConfirmSubmitDialog` (the count message + Cancel/close/Confirm wiring) — leaving `showReviewScreen`/`renderQuestionForEdit`/`reopenQuestion` as-is per the review's own note that they're genuinely more different (no SRS-baseline/`priorHistory` to preserve in the drill); dead `questionShownAt` in `runCategoryDrill` (assigned, never read) deleted; `test.html`'s two picker-wiring blocks (only the `timed` flag differing) consolidated into one `wireDrillPicker(select, link, timed)` helper. 293/293 tests green (9 new), `verify.mjs` clean. Live-tested in the browser: full untimed run (start → answer → flag+skip → review → reopen + live-edit-flag-during-edit + change answer → confirm-submit dialog with correct counts → completion), full timed run forced to expire via a `Date.now` monkey-patch specifically while the confirm-submit dialog was open (the fixed bug's exact repro — confirmed the dialog closes and the completion screen renders cleanly with no stray modal), both category-not-found error paths, and a full regression pass of the real S3 timed test (66-question form, timer, review, confirm-submit counts, submit → `results.html`) to confirm the shared-helper extraction changed nothing there. `localStorage` confirmed byte-for-byte untouched (`null`) through every drill path — the core property the review needed to verify — zero console errors throughout, zero stray real clicks (verified via a `document.addEventListener('click', ..., true)` capture, this project's established anti-contamination technique). **Phase 6.8 (S2 redesign) is now fully done.** |
| 2026-08-20 | Phase 6.9.1 — teaching-page design pass, proof chapter | [PR #63](https://github.com/homesik92/PRAXIS-Practice/pull/63). Settled D-29: `data/teaching/<code>.json` reuses SCHEMA.md §2.9's reference-panel `sections`/`entries`/`{format, value}` shape verbatim, adding a per-section `categoryId`; new standalone page `teach.html?code=<code>&category=<id>` (no timer/scoring/`questionHistory` write), rendering fully reused from `js/reference-panel.js` with no new render code. New `teachingContent` bank field, `js/schema.js`'s `loadTeachingContent`, `tools/verify.mjs`'s `leafCategoryIds`/`validateTeachingContent`. Proved against 5165's "Number and Quantity" (I-A) — 3 sections (concept overview, worked example, common mistakes), exercising both `text` and `mathml`. 8-angle `/code-review` at high effort found 4 real findings, all fixed: a `continue` inside `verify.mjs`'s per-bank loop silently skipped teachingContent validation whenever the same bank's referencePanel JSON failed to parse — fixed via a shared `validateAndReportContentFile` helper that `return`s instead (also closed a ~14-line copy-paste); `teach.html`'s categoryId filter used an exact match, so a branch category (e.g. "I") showed "no lesson" even with authored leaf chapters — fixed via `categoryAndDescendantIds`, matching every other category-picker entry point; no `Array.isArray` guard before `.filter()`-ing a malformed/missing `sections` array — fixed; this ROADMAP entry itself wasn't flipped in the same pass that settled the design — fixed by writing it. 301/301 tests green (10 new), `verify.mjs` clean. Live-tested in the browser: the authored chapter renders correctly (MathML fractions/radicals/ℤ all display properly), both category-not-found and no-lesson-yet-authored paths, missing code/category params, zero console errors. Merged 2026-08-20 with the session owner's explicit go-ahead. |
| 2026-08-20 | Phase 6.9.2 — Mathematics' remaining 5 chapters authored | Drafted the 5 remaining Mathematics chapters (I-B Algebra, II-A Functions, II-B Calculus, III Geometry, IV Statistics & Probability) into `data/teaching/5165.json`, completing all 6 leaf categories. Same 3-section shape as 6.9.1's I-A proof chapter, written from scratch against general math-teaching knowledge per the ETS copyright rule. Drafted via 5 parallel agents (one per chapter, content-authoring-heavy work) with per-chapter id prefixes (`algebra-`/`functions-`/`calculus-`/`geometry-`/`statistics-`); merge-time cross-check confirmed zero id collisions across all 6 chapters (14 pre-existing + 83 new ids, all unique). No schema/code changes needed — 301/301 tests still green, `verify.mjs` clean. Since content correctness (not code) is this project's real risk surface here, ran a dedicated independent-verification pass — redid every worked example's arithmetic from scratch and structurally checked all 29 new MathML blocks — which found one real bug: II-A's "transformations of a parent function" entry stated the wrong order for combining a horizontal shift and stretch/reflection (for `y = a*f(b(x-h)) + k`, since `b(x-h) = bx - bh`, the stretch must apply before the shift, not after — proven by counterexample). Fixed directly in the content; no other mathematical, MathML-structural, or copyright/originality issues found. Live-tested all 5 new chapters in the browser plus the branch-category aggregation case (parent category "I" correctly renders both I-A and I-B together) — MathML confirmed rendering as real math via screenshot, zero console errors throughout. |
| 2026-08-21 | Phase 6.9.3 — Start-menu "Study a topic" control wired up | [PR #68](https://github.com/homesik92/PRAXIS-Practice/pull/68). Replaced the `disabled` "Coming soon" stub with a real category picker, matching Practice-a-topic/Category-test's existing `<select>` + link pattern rather than inventing new UI. Generalized the previously drill-only `wireDrillPicker` into `wireCategoryPicker(select, link, hrefFn)`, now shared by all three pickers — a justified simplification once a third, differently-shaped href function needed the same wiring, not new abstraction for its own sake. Links to `teach.html?code=<code>&category=<selected>`. Removed the now-dead `.coming-soon-badge` CSS rule (its only usage). Shallow, self-reviewed per Gate 3. `verify.mjs` clean. Live-tested locally: both a leaf category (Algebra) and a branch category (Number & Quantity and Algebra, aggregating its two children) render real teaching content through the new link, zero console errors. All 6.9 sub-phases now done — Phase 6.9 fully closed. |
| 2026-08-21 | Fix #66 — score-meter "Not started" text overflow | [PR #67](https://github.com/homesik92/PRAXIS-Practice/pull/67). The empty-state score meter's "Not started" label overflowed the ring's edges at narrow (mobile) widths — split into two stacked SVG `<tspan>` lines instead of one. Also investigated two other issues the session owner reported after a live full-test attempt (results-page comparison meters and the post-test full review) — both turned out to be the session owner looking at the wrong/an intermediate screen, not real bugs; confirmed by reproducing a real full attempt live rather than guessing from source. Shallow, self-reviewed. `verify.mjs`/`test-verify.mjs` clean. Verified visually at desktop (800px) and mobile (375px) widths. Merged with explicit go-ahead. |
| 2026-08-20 | S2 Start-menu labels show total time | Ad-hoc request from the session owner: "Full practice test" and "Category test" gained a parenthetical `(N Minutes)` in `test.html`. Computed dynamically from the loaded bank rather than hardcoded, since the value depends on the active test's own data: full test uses `bank.timeLimitMinutes` directly; category test uses the same proportional formula `run.html` already applies to its own countdown timer, `Math.max(1, Math.round((bank.timeLimitMinutes * 10) / bank.formLength))` — 27 minutes for 5165 today. Display-only, no logic/persistence touched — shallow, self-reviewed per Gate 3. 301/301 tests unaffected (no new tests needed), `verify.mjs` clean. Live-verified in the browser: both labels render "Full practice test (180 Minutes)" and "Category test (27 Minutes)" correctly, screenshot-confirmed, zero console errors. |
| 2026-08-19 | Phase 8.1/8.2 — NAS hosting decided, first deploy live | Resolved 8.1 (open since Phase 4's design plan): session owner's Synology NAS, Web Station (not a plain file share — `fetch()` for `data/manifest.json`/question banks doesn't work under `file://`), SSH-driven transfer via a dedicated low-privilege `praxis-deploy` account rather than admin. Bootstrapping that account's SSH key access cost most of a session on its own: DSM 7.2.1 has no per-user "SSH Key" GUI tab (removed/not-yet-added in this version), so the key was placed manually in `authorized_keys` — which then still failed auth with a bare `Permission denied (publickey,password)` despite verifiably-correct key content, ownership, permissions, home-directory path, `sshd_config`, and PAM config, and with **zero evidence in any log**, including DSM's own Log Center (traced to: OpenSSH's PAM auth chain, which is what all of Synology's logging hooks into, is only invoked for password auth, never for publickey — so a failed publickey attempt is invisible everywhere). Root cause only surfaced by running a disposable debug `sshd -d` instance on a spare port and reading its live verbose output directly: Synology's own `syno_acl_safe_path` check was rejecting based on a Windows-style ACL on the home directory, invisible in a plain `ls -l` unless you know to look for the trailing `+`. Fixed via `synoacltool -del` (which itself zeroed the POSIX permission bits as a side effect, needing a follow-up `chmod 711`). Web Station's Virtual Host (Web Service + Port-based Web Portal, port 8080, Nginx, static site type) was comparatively simple once SSH worked. First deploy (8.2) copied the site to `/volume1/praxis-practice` via a plain `tar`-over-SSH pipe, since rsync/scp/sftp all turned out to be independently blocked on this NAS for reasons not further diagnosed (plain shell exec confirmed working throughout, isolating the problem to those three transfer tools specifically, not auth or write permissions). Deploy was done from a clean `main` checkout — `feature/6.7-restore-progress`'s in-progress uncommitted work was stashed first and restored immediately after, untouched. **Site is live at `http://10.0.0.37:8080/`**, homepage and `data/manifest.json` both confirmed serving correctly. 8.2 stays ◐, not ☑: a complete timed attempt hasn't been live-tested start-to-score against this real deployment yet, and this deploy was a direct overwrite with no "previous version kept alongside for rollback" folder in place — both still open against this task's own Accepts criteria. Full diagnostic detail for both the SSH/ACL and the rsync/scp/sftp landmines lives in the session owner's own NAS-device notes, not repeated here since it applies to any future project on this NAS, not just this one. |

