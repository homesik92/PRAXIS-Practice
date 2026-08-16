# Roadmap

## Current phase: design stage complete — session 4 (coding plan) in progress

Scaffold done, compressed design plan approved (D-7), and design sessions 1–3 complete —
[BLUEPRINT.md](BLUEPRINT.md), [SCHEMA.md](SCHEMA.md), [REVIEW.md](REVIEW.md). The one
open fork (5165 calculator) is resolved: D-14, a built scientific (non-graphing)
calculator, filed as B-9 for the coding plan to size.

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
| 4 | Coding plan | Phases 0–n below, walking-skeleton shaped. | Strongest / extra-high | ☐ In progress |

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

- **0.1 Local verification gate.** `tools/verify.mjs`, plain Node (the machine has
  Node 22; no `package.json`, no install step — the gate must not become the site's
  first dependency). Validates every bank file against SCHEMA.md: `schemaVersion`
  present, category weight counts sum to the test's total, every question `id` unique
  and namespaced correctly, `correct` references real option ids, `format` values are
  one of the known three, `retired` questions excluded from nothing but new draws. This
  becomes the *only* gate (N-1) — CLAUDE.md's Verification section is filled in with the
  exact command once this lands.
- **0.2 Progress-store safety net.** The backup-before-migrate mechanism from SCHEMA.md
  §2.8, built and unit-tested **before any other persistence code**, per BACKLOG.md B-6.
  This is infrastructure, not a feature — nothing else in Phase 2 should write to the
  store until this exists under it.
- **0.3 Static skeleton.** The file layout above, `manifest.json` with zero tests
  registered, and `data/tests/` empty — proves the page shells load with nothing in them
  yet.

### Phase 1 — Walking skeleton

One test (5165, arbitrarily — the smallest bank at 66 questions), one thin path,
end-to-end, deliberately minimal (no flagging, no review pass, no spaced repetition yet):

- **1.1** `manifest.json` registers 5165 with a **5-question placeholder bank** (real
  content, not lorem ipsum — but not the 66-question production bank). S1 lists it; S2
  offers *take a test*.
- **1.2** S3 minimal runner: Start → timer → single-select question → advance on answer
  → auto-score at the end. No flag control, no review pass yet (Phase 3).
- **1.3** S4 minimal dashboard: overall score and a bare per-category percentage.
- **Live-test milestone:** open `index.html` from the filesystem, pick 5165, take the
  5-question form start to finish, see a score. This is the phase that proves the
  architecture before the other three tests or any hardening gets built on top of it.

### Phase 2 — Core data & persistence

- **2.1** Full `schema.js`: all four tests registered, variable-depth category tree
  (§2.4), overlay tags (§2.5), weight-correct form assembly with disclosed shortfalls
  (§2.7) — replaces Phase 1's placeholder draw logic.
- **2.2** Full `store.js`: attempt records with `status` and per-answer write cadence
  (real resumability, review finding #1), cross-tab `storage`-event reconciliation
  (finding #2).
- **2.3** `srs.js`: SM-2 bootstrap values and recurrence (finding #4), `questionHistory`
  wired to the runner's per-answer writes.
- **2.4** Shortfall audit trail: `categoryTargets` persisted alongside `shortfalls`, S4's
  self-verification against them (finding #3).

**Schema is stable after this phase — Phase 7 (content authoring) can start here,
in parallel with Phases 3–6.**

### Phase 3 — Runner completeness

- **3.1** Flag-toggle control (finding #13) + end-of-run review pass: list with stem
  excerpt and category per row (finding #16), reopen and change any answer.
- **3.2** Confirm-before-submit dialog showing unanswered/flagged counts (finding #11).
- **3.3** Résumé flow: S2's "Resume attempt" entry (finding #10), the
  time-expired-while-away screen.
- **3.4** Accessibility pass on the runner specifically: persistently-focusable
  timer/position element (finding #12), queued announcements (finding #15), a full
  keyboard-only run-through with no mouse.

### Phase 4 — Study mode & dashboard depth

- **4.1** S5 topic study: category picker (any depth of the tree), untimed, explanation
  shown immediately after each answer.
- **4.2** S4 full dashboard: per-category correct/incorrect, full review list with
  explanations, shortfall disclosure surfaced legibly (not just logged).
- **4.3** "N questions due" entry point on S2, driven by `srs.js`'s `dueAt` values.

### Phase 5 — Reference materials (5165, 5485)

- **5.1** 5165 static formula/notation panel: authored content (B-5) in the shared
  non-modal `reference-panel.js` component (finding #17 — never obscures the stem,
  returns focus on dismiss).
- **5.2** 5165 scientific calculator (D-14, B-9): arithmetic, log, trig and inverse trig.
  **No graphing.** Keyboard-operable, screen-reader-usable output, no color-only state.
- **5.3** 5485 periodic table + physical-constants panel, same shared component.

### Phase 6 — Hardening

- **6.1** Storage-failure handling: visible errors on quota-exceeded writes and
  unparseable reads, no silent reinitialization (finding #6).
- **6.2** "Download my progress" export (finding #9).
- **6.3** Backup retention pruning — keep only the immediately-prior version (finding #8).
- **6.4** Full keyboard/screen-reader pass across all five screens, not just the runner.

### Phase 7 — Content authoring (parallel track)

Batch sessions per BACKLOG.md's triage conventions, breadth-first per D-4/N-3: 5101
(120), 5165 (66), 5485 (125), 5652 (100) — **411 questions**, each authored *and*
answer-key-verified at high effort (SKILL.md's model/effort guidance). The first session
per test is a calibration session — BLUEPRINT.md's F-1 sizing (~20–30 questions/session)
gets checked against real throughput and this section revised from it. 5165 and 5485
authoring is blocked on Phase 5.1/5.3 landing (the reference content needs to exist
before questions that depend on it can be written against it).

### Phase 8 — Launch (NAS)

Per SKILL.md's trimmed launch-and-cutover guidance (staged exposure and canary
percentages don't apply at this scale; the two retained disciplines are the rollback
plan and the progress-store's expand/contract migration safety, already built in
Phase 0.2).

- **8.1 NAS hosting mechanism — open, the session owner's to decide.** Asked earlier in
  this project and not yet answered: which NAS (Synology/QNAP/Unraid/TrueNAS/other) and
  which serving mechanism (Web Station, a container, a plain file share). Needed before
  this phase can be planned in more detail than "copy the built files there."
- **8.2** First deploy: copy the static tree to the NAS, keep the previous version's
  folder alongside it so rollback is a rename, live-test a full timed attempt served
  from the NAS (not `file://`) before calling any phase "done" per Gate 5.

## Session log

| Date | Session | Outcome |
| --- | --- | --- |
| 2026-08-16 | Repo scaffold & design planning | Created repo (local only, no remote), vendored and adapted the dev-workflow skill, wrote the initial doc set, logged D-1–D-6 and N-1–N-2, filed B-1–B-3, drafted SEED.md. Proposed an 8-session design plan; session owner approved a compressed 4-session version (D-7). **No code written.** |
| 2026-08-16 | Design session 1 — blueprint extraction | Extracted all four test blueprints from the study companions; category counts verified to sum to each test's stated total. Produced BLUEPRINT.md with six findings (F-1–F-6). Logged D-7–D-9 and N-3 (411-question v1 authoring load; spaced repetition in scope; screen flow). **One fork left open: question format.** |
| 2026-08-16 | Design session 2 — requirements & schema | Settled the open format fork (D-10: uniform now, extensible schema), added a one-review-pass end-of-run step (D-11), scoped in the two reference panels (D-12). Produced SCHEMA.md: screens S1–S5, form-assembly rules (weight-correct, shortfalls disclosed not backfilled), the variable-depth category tree + overlay axis, the question record (`type`/`correct[]` for painless format extension, `format` discriminator for text/mathml/code), and the progress store with SM-2-style spaced repetition and a mandatory pre-migration backup. Closed B-1, B-2. Filed B-4 (MathML support unverified), B-5 (reference-panel schema), B-6 (backup must land in Phase 0). |
| 2026-08-16 | Calculator fork resolved | Session owner chose D-14: build a scientific (arithmetic, log, trig) on-screen calculator for 5165, explicitly excluding graphing. Closed B-7, filed B-9 for the coding plan. Design stage now fully closed — proceeding to session 4. |
| 2026-08-16 | Design session 3 — adversarial review | Two fresh, context-free reviewers (data integrity; UX/accessibility) found 19 issues against SCHEMA.md and BLUEPRINT.md — both independently flagged the same core gap: "resumable" was a stated requirement with no backing data model. Triaged and remediated 18 directly in SCHEMA.md (résumé/`status` field with per-answer write cadence, cross-tab `storage`-event reconciliation, auditable shortfall targets, SM-2 bootstrap values, visible storage-failure handling, `retired` flag instead of question deletion, progress export, backup retention policy, confirm-before-submit, screen-reader-queryable timer/position, a flag-toggle control, queued announcements, richer review-list rows, non-modal reference panels, first-run orientation copy). Zero rejected. **One escalated** (B-7): D-12's 5165 reference panel quietly narrowed BLUEPRINT.md's F-3 graphing-calculator requirement to a static formula sheet — three options recorded in REVIEW.md, awaiting the session owner. Logged D-13. |
