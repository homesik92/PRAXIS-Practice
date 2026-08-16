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
| 1 | Walking skeleton | ☐ |
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

- ☐ **1.1 Placeholder bank and registration.** `manifest.json` registers 5165 with a
  **5-question placeholder bank** (real content, not lorem ipsum — but not the
  66-question production bank). S1 lists it; S2 offers *take a test*.
  *Accepts:* S1 shows 5165 with a question count of 5; choosing it reaches S2's *take a
  test* entry.
- ☐ **1.2 Minimal test runner.** S3: Start → timer → single-select question → advance
  on answer → auto-score at the end. No flag control, no review pass yet (Phase 3).
  *Accepts:* all 5 placeholder questions can be answered in sequence and the run
  auto-scores at the end.
- ☐ **1.3 Minimal results dashboard.** S4: overall score and a bare per-category
  percentage.
  *Accepts:* S4 shows the correct overall score and at least one per-category
  percentage for the 5-question run.

**Live test at end of phase 1** — open `index.html` from the filesystem, pick 5165,
take the 5-question form start to finish, see a score. This is the phase that proves
the architecture before the other three tests or any hardening gets built on top of it.

### Phase 2 — Core data & persistence

- ☐ **2.1 Full category and form-assembly engine.** `schema.js`: all four tests
  registered, variable-depth category tree (§2.4), overlay tags (§2.5), weight-correct
  form assembly with disclosed shortfalls (§2.7) — replaces Phase 1's placeholder draw
  logic.
  *Accepts:* each test's assembled form matches its blueprint weighting exactly, or
  reports an explicit shortfall when it can't.
- ☐ **2.2 Full progress store.** `store.js`: attempt records with `status` and
  per-answer write cadence (real resumability, finding #1), cross-tab `storage`-event
  reconciliation (finding #2).
  *Accepts:* closing and reopening the tab mid-attempt resumes at the last-answered
  question; two tabs open at once don't silently discard each other's writes.
- ☐ **2.3 Spaced repetition scheduling.** `srs.js`: SM-2 bootstrap values and
  recurrence (finding #4), `questionHistory` wired to the runner's per-answer writes.
  *Accepts:* every answered question gets a `dueAt` computed from SM-2's bootstrap
  values, and answering it again reschedules it.
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

