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
| 7 | Content authoring (parallel track) | ☐ |
| 8 | Launch (NAS) | ☐ |

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
depend on it can be written against it).

### Phase 8 — Launch (NAS)

Per SKILL.md's trimmed launch-and-cutover guidance (staged exposure and canary
percentages don't apply at this scale; the two retained disciplines are the rollback
plan and the progress-store's expand/contract migration safety, already built in
Phase 0.2).

- ☐ **8.1 NAS hosting mechanism — open, session owner's to decide.** Which NAS
  (Synology/QNAP/Unraid/TrueNAS/other) and which serving mechanism (Web Station, a
  container, a plain file share). Needed before this phase can be planned in more
  detail than "copy the built files there."
  *Accepts:* n/a — a decision, not a build task; resolves once the session owner
  chooses.
- ☐ **8.2 First deploy.** Copy the built static tree to the NAS, keep the previous
  version's folder alongside it so rollback is a rename, live-test a full timed attempt
  served from the NAS (not `file://`) before calling any phase "done" per Gate 5.
  *Accepts:* a complete timed attempt, start to score, works when served from the NAS;
  rolling back is a folder rename with no rebuild.

## Session log

| Date | Session | Outcome |
| --- | --- | --- |
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

