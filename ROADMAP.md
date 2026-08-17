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
| 2 | Core data & persistence | ☐ |
| 3 | Runner completeness | ☐ |
| 4 | Study mode & dashboard depth | ☐ |
| 5 | Reference materials (5165, 5485) | ☐ |
| 6 | Hardening | ☐ |
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
- ☐ **2.4 Shortfall audit trail.** `categoryTargets` persisted alongside `shortfalls`;
  S4 self-verifies against them (finding #3).
  *Accepts:* S4's reported shortfall matches a value recomputed independently from
  stored per-category counts.

**Schema is stable after this phase** — Phase 7 (content authoring) can start here,
in parallel with Phases 3–6.

### Phase 3 — Runner completeness

- ☐ **3.1 Flag and review pass.** Flag-toggle control (finding #13) + end-of-run review
  pass: list with stem excerpt and category per row (finding #16), reopen and change
  any answer.
  *Accepts:* every flagged question appears in the review list; reopening and changing
  an answer there updates the stored attempt.
- ☐ **3.2 Confirm-before-submit.** Dialog showing unanswered/flagged counts before
  scoring (finding #11).
  *Accepts:* the dialog's counts match the actual number of unanswered and flagged
  questions at submit time.
- ☐ **3.3 Résumé flow.** S2's "Resume attempt" entry (finding #10), the
  time-expired-while-away screen.
  *Accepts:* an in-progress attempt resumes at its saved position; one whose deadline
  passed while the tab was closed shows the expired screen instead of silently scoring
  on load.
- ☐ **3.4 Runner accessibility pass.** Persistently-focusable timer/position element
  (finding #12), queued announcements (finding #15), a full keyboard-only run-through
  with no mouse.
  *Accepts:* a complete run — start to score — is achievable with the keyboard alone
  and a screen reader.

### Phase 4 — Study mode & dashboard depth

- ☐ **4.1 Topic study screen.** S5: category picker (any depth of the tree), untimed,
  explanation shown immediately after each answer.
  *Accepts:* picking any category at any depth starts an untimed drill limited to that
  category, with the explanation visible right after each answer.
- ☐ **4.2 Full results dashboard.** S4: per-category correct/incorrect, full review
  list with explanations, shortfall disclosure surfaced legibly (not just logged).
  *Accepts:* every category shows a correct/incorrect count; a shortfall (from 2.4) is
  stated in the visible dashboard text, not just console/log output.
- ☐ **4.3 Spaced-repetition entry point.** "N questions due" on S2, driven by
  `srs.js`'s `dueAt` values.
  *Accepts:* the displayed count matches the number of questions whose `dueAt` has
  passed.
- ☐ **4.4 Weakest-category suggestion (D-18).** S2 surfaces the lowest-accuracy
  category once any category in the test has at least 5 answered questions, linking
  directly into S5 pre-filtered to that category.
  *Accepts:* a test with mixed per-category accuracy and at least one category over the
  5-question threshold shows the correct lowest-accuracy category and links into a
  pre-filtered S5 run; a test with every category under threshold shows no suggestion.

### Phase 5 — Reference materials (5165, 5485)

- ☐ **5.1 5165 formula/notation panel.** Authored content
  ([issue #3](https://github.com/homesik92/PRAXIS-Practice/issues/3)) in the shared
  non-modal `reference-panel.js` component (finding #17 — never obscures the stem,
  returns focus on dismiss).
  *Accepts:* the panel opens without covering the question stem and returns keyboard
  focus to its opening control on dismiss.
- ☐ **5.2 5165 scientific calculator (D-14).** Arithmetic, log, trig, and inverse trig
  ([issue #6](https://github.com/homesik92/PRAXIS-Practice/issues/6)). **No graphing.**
  Keyboard-operable, screen-reader-usable output, no color-only state.
  *Accepts:* every listed operation is reachable and operable by keyboard, and its
  output is announced to a screen reader.
- ☐ **5.3 5485 reference panel.** Periodic table + physical-constants panel, same
  shared component.
  *Accepts:* the panel is reachable, dismissible, and keyboard-operable the same way
  5.1's is.

### Phase 6 — Hardening

- ☐ **6.1 Storage-failure handling.** Visible errors on quota-exceeded writes and
  unparseable reads, no silent reinitialization (finding #6).
  *Accepts:* a simulated quota-exceeded write and a corrupted stored value each surface
  a visible message rather than silently discarding data or reinitializing the store.
- ☐ **6.2 Progress export.** "Download my progress" (finding #9).
  *Accepts:* the exported file is valid JSON containing the full store, openable
  independently of the site.
- ☐ **6.3 Backup retention pruning.** Keep only the immediately-prior backup version
  (finding #8).
  *Accepts:* after repeated migrations, exactly one backup survives regardless of how
  many migration steps ran.
- ☐ **6.4 Full accessibility pass.** Keyboard/screen-reader pass across all five
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

