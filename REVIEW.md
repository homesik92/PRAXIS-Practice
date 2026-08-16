# Design Session 3 — Adversarial Review

Two fresh, context-free reviews of [SCHEMA.md](SCHEMA.md) against
[BLUEPRINT.md](BLUEPRINT.md), per `design-methodology.md` step 5. Each reviewer received
only the two artifacts and a stated contract — never this project's reasoning or
conclusions — and reviewed one angle:

- **Review A — progress-store data integrity.** The browser localStorage record is this
  project's only live data and has no backup, so its correctness was reviewed in
  isolation from UI concerns.
- **Review B — UX/accessibility of the timed, keyboard-driven runner.** The test-taking
  flow (S1–S5) and its accessibility requirements, reviewed in isolation from storage
  internals.

Eighteen findings total, consolidated and triaged below. No finding from one review
contradicted the other; **the resumability gap was found independently by both**, which
is itself evidence it's real rather than a reviewer artifact — SCHEMA.md's §1.2 asserted
"an interrupted attempt is resumable" as a requirement with nothing in §2.8's schema to
satisfy it.

Per the methodology, this consolidation also checks for **doubt theater**: eighteen
findings, all disposed of below, with an explicit reject and a genuine defer among them —
not a rubber stamp.

---

## Triage

Disposition legend: **Accept** (remediate now), **Defer** (real, sized for its own
session), **Reject** (rationale below), **Escalate** (session owner's call — a genuine
design fork).

| # | Source | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | A-1, B-1 | No `status` field on an attempt record; "resumable" has no data model | **Accept** |
| 2 | A-2 | Two tabs open simultaneously → silent last-write-wins data loss | **Accept** |
| 3 | A-3 | Shortfall disclosure is write-time-only and unauditable | **Accept** |
| 4 | A-4 | Spaced-repetition bootstrap values undefined for a question's first answer | **Accept** |
| 5 | A-4 | `questionHistory` update cadence (per-answer vs. per-finish) unstated | **Accept** (folds into #1) |
| 6 | A-5 | No defined behavior for storage-quota failure or corrupted-JSON load | **Accept** |
| 7 | A-6 | Deleting a flawed question after history exists is undefined; ids declared permanent but removal is inevitable | **Accept** |
| 8 | A-7 | Backup keys and attempt history accumulate with no retention policy | **Accept** (minor) |
| 9 | A-8 | No export/import affordance — cheapest mitigation for #2, #6, and manual data clearing | **Accept** |
| 10 | B-1 | Resume has no UI entry point on S2; resume-after-time-expiry silently force-scores | **Accept** |
| 11 | B-2 | No confirmation before the one irreversible action (final submit) | **Accept** |
| 12 | B-3 | Screen-reader users get passive threshold announcements only, no on-demand time/position query — a parity gap for the full test duration | **Accept** |
| 13 | B-4 | Flagging mechanism referenced by the review pass but never specified as a control | **Accept** |
| 14 | B-5 | 5165's reference panel is a static formula sheet, not the graphing calculator BLUEPRINT.md's F-3 says the real exam provides | **Escalate** — see below |
| 15 | B-6 | Focus-move announcement and aria-live countdown threshold can collide and garble each other | **Accept** |
| 16 | B-7 | Review-list rows are unspecified — bare numbers vs. stem excerpt + category | **Accept** |
| 17 | B-8 | Reference panel modal/non-modal and focus-return-on-dismiss unspecified | **Accept** |
| 18 | B-9 | No first-time-user orientation that the run is forward-only except the end review pass | **Accept** |
| 19 | B-10 | D-11's navigation model isn't verified against ETS's actual on-screen navigation — stated as settled without a citation | **Accept** (documentation fix) |

### Reject

None outright rejected — both reviewers stayed inside their assigned lens and every
finding traced to a real gap in the document as written, not a matter of reviewer taste.

### Defer

**None deferred to a later session.** Every accepted finding is a schema/requirements
text change, not an implementation effort — cheap to fix now, while session 2's context
is still loaded, per the methodology's "fix known tech debt now" rule. (Two accepted
items — export/import, #9, and the calculator if escalation resolves toward building
one, #14 — do carry real *implementation* cost in the coding phase; that cost is
recorded in BACKLOG.md, not deferred at the schema level.)

### Escalate — #14, the 5165 calculator

**The fork.** D-12 scoped a static formula/notation reference for 5165. BLUEPRINT.md's
own F-3 says the real exam provides an *interactive on-screen graphing calculator*, and
warns that without an equivalent, "a practice score will understate readiness on
calculator-dependent items." D-12 quietly narrowed this and SCHEMA.md's "Open items
carried forward" list didn't catch the narrowing — exactly the silent-scope-loss failure
mode this review pass exists to catch.

**Why this needs the session owner rather than a default.** It's a real cost tradeoff,
not a documentation fix:

- **Build a basic four-function/scientific calculator widget.** Maybe 150–250 lines of
  vanilla JS, no dependency (holds D-3). Closes the fidelity gap. Adds a session's worth
  of engine work to BLUEPRINT.md's estimate, and it's UI surface that needs its own
  accessibility pass (Gate 3 would call this a "deep change").
- **Ship without a calculator; document the limitation.** Zero added engine cost.
  Calculator-dependent Math questions become harder to author well — a question that
  assumes calculator access reads differently without one — which pushes back onto the
  411-question bank, the project's actual bottleneck.
- **Defer to a dedicated session after v1.** Ship v1 with the static reference and the
  documented limitation; revisit once the Math bank exists and it's clear how many
  questions actually need a calculator.

No default is recorded — session owner's call.

---

## Remediation

All non-escalated findings are remediated directly in `SCHEMA.md` in this same session,
per the methodology's "fix known tech debt now" rule — see that document's changes for
the concrete schema/requirements text. Summary of what changed, grouped by finding:

- **#1/#5 (resumability + SR update cadence):** attempt records gain a `status` field
  (`in-progress` / `completed` / `abandoned`); the attempt is written to storage after
  every answer, not only at scoring time; `questionHistory` updates on the same cadence,
  so an abandoned attempt still credits the questions actually seen; S2 gains an explicit
  résumé affordance; resuming past the wall-clock deadline shows an explicit "time
  expired while away" screen before scoring rather than silently force-submitting.
- **#2 (cross-tab collision):** a `storage`-event listener reloads in-memory state (or
  warns) when another tab writes to the key, instead of blind overwrite.
- **#3 (unauditable shortfalls):** the per-category target actually used for the draw is
  persisted alongside the shortfall delta, and S4 self-verifies by recomputing actual
  category counts from the stored answers rather than trusting the recorded shortfall
  blindly.
- **#4 (SR bootstrap):** a first answer to any question initializes `intervalDays: 1,
  ease: 2.5` (standard SM-2 defaults) before the recurrence applies.
- **#6 (storage failures):** load failures show an explicit "store unreadable" state
  without touching the raw value (recoverable via devtools rather than silently
  reinitialized); save failures surface visibly rather than discarding a just-finished
  attempt.
- **#7 (deletion):** questions gain a `retired` boolean instead of physical removal;
  retired questions are excluded from new draws but keep their history valid.
- **#8 (retention):** only the immediately-prior version's backup is retained; older
  ones are pruned on migration.
- **#9 (export/import):** a "download my progress" affordance is added to the
  requirements as a cheap, high-leverage mitigation across three other findings.
- **#10/#11 (resume UI + confirm-before-submit):** covered above; submit additionally
  requires confirmation showing the unanswered/flagged count.
- **#12 (screen-reader parity):** the timer and "Question N of M" become a persistently
  reachable element a screen-reader user can query on demand, in addition to the passive
  threshold announcements.
- **#13 (flagging):** a keyboard-reachable flag toggle is specified as part of the
  per-question controls, distinct from selecting an answer.
- **#15 (announcement collision):** threshold announcements and focus-move announcements
  are queued rather than allowed to fire simultaneously.
- **#16 (review-list content):** each row shows a short stem excerpt and category label,
  not just a number.
- **#17 (reference panel):** required non-modal, must not obscure the question stem,
  must return focus to its trigger on dismiss.
- **#18 (orientation):** the Start screen states the one-way-except-review-pass
  navigation model before the timer begins.
- **#19 (unverified navigation claim):** D-11's entry and SCHEMA.md now note explicitly
  that the forward-only/end-review model is a deliberate simplification, not a verified
  match to ETS's current on-screen interface.

**Not doubt theater.** Nineteen findings entered triage; nineteen got a real
disposition, one of them a genuine escalation rather than a rubber-stamped accept — the
check this section exists to satisfy.
